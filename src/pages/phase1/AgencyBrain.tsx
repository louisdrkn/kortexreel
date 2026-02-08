import { useCallback, useEffect, useState } from "react";
import { CommandHeader } from "@/components/layout/CommandHeader";
import {
  AlertCircle,
  Brain,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  FileText,
  Globe,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePOD } from "@/contexts/PODContext";
import { useToast } from "@/hooks/use-toast";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { SaveButton } from "@/components/SaveButton";
import { AutoSaveIndicator } from "@/components/ui/auto-save-indicator";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyDocuments } from "@/hooks/useCompanyDocuments";
import { useLocalAutoSave } from "@/hooks/useLocalAutoSave";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
type UploadStatus = "idle" | "uploading" | "success" | "error";
interface UploadedDoc {
  name: string;
  status: UploadStatus;
  content?: string;
}

// Composant Visuel (La Barre "Guedin")
const KortexProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full max-w-md mx-auto my-4 scale-in-center animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-cyan-400">
          ANALYSE NEURALE EN COURS
        </span>
        <span className="text-xs font-medium text-white">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full bg-gray-900 rounded-full h-2.5 border border-gray-800 relative overflow-hidden">
        {/* Background pulse effect */}
        <div className="absolute inset-0 bg-cyan-900/20 animate-pulse"></div>
        <div
          className="bg-gradient-to-r from-violet-600 via-cyan-500 to-cyan-300 h-2.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(6,182,212,0.6)] relative z-10"
          style={{ width: `${progress}%` }}
        >
          {/* Inner shimmer effect */}
          <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-150%] animate-[shimmer_1.5s_infinite]">
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center animate-pulse font-mono tracking-wide">
        {progress < 30 && "INITIALISATION DU CORE..."}
        {progress >= 30 && progress < 50 &&
          "RECHERCHE DE PATTERNS DANS LA DATA..."}
        {progress >= 50 && progress < 70 && "EXTRACTION DES SIGNAUX FAIBLES..."}
        {progress >= 70 && progress < 90 &&
          "GÉNÉRATION DES CARTES PROSPECTS..."}
        {progress >= 90 && "FINALISATION DU RAPPORT..."}
      </p>
    </div>
  );
};
export default function AgencyBrain() {
  const { currentProject } = useProject();
  const {
    agencyDNA,
    updateAgencyDNA,
    saveAgencyDNA,
    isSaving,
    targetCriteria,
    updateTargetCriteria,
    agencyDNAStatus,
    lastSavedAt,
  } = usePOD();
  const {
    toast,
  } = useToast();
  const {
    documents,
    isUploading,
    uploadDocument,
    deleteDocument,
    getAllExtractedContent,
  } = useCompanyDocuments();
  // No local state for websiteUrl - standardizing on agencyDNA
  const websiteUrl = agencyDNA.websiteUrl || "";

  // Auto-scanning state
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isExtractingTrackRecord, setIsExtractingTrackRecord] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  // L'EFFET MAGIQUE : Fait avancer la barre tout seul
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoScanning) {
      // On démarre à 0
      setProgress(0);

      interval = setInterval(() => {
        setProgress((oldProgress) => {
          // Si on est à 90%, on attend (on ne va pas à 100% sans la data)
          if (oldProgress >= 90) {
            return 90;
          }
          // Sinon, on avance d'un montant aléatoire (pour faire naturel)
          const jump = Math.random() * 5;
          return Math.min(oldProgress + jump, 90);
        });
      }, 200); // Mise à jour rapide pour fluidité
    } else {
      // Si le chargement est fini, on reset (ou on laisse à 100 un instant)
      if (progress > 0 && progress < 100) setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isAutoScanning]);

  // Auto-Save Hook Integration with localStorage persistence
  // FIX: Siamese Twin Bug - Use distinct v2 keys
  const [pitch, setPitch] = useLocalAutoSave({
    storageKey: `agency_pitch_v2_${currentProject?.id}`,
    initialValue: agencyDNA.pitch || "",
    onCloudSync: async (newPitch) => {
      // FIX: Use debounced save (false) instead of immediate to prevent DB race conditions/spam
      await updateAgencyDNA({ pitch: newPitch }, false);
    },
  });

  const [methodology, setMethodology] = useLocalAutoSave({
    storageKey: `agency_methodology_v2_${currentProject?.id}`,
    initialValue: agencyDNA.methodology || "",
    onCloudSync: async (newMethod) => {
      await updateAgencyDNA({ methodology: newMethod }, false);
    },
  });

  // SYNC-ON-LOAD: Ensure what the user sees (Local) is what the Engine gets (DB)
  useEffect(() => {
    if (currentProject?.id) {
      let hasUpdates = false;
      const updates: any = {};

      // Check Pitch
      if (pitch && pitch !== agencyDNA.pitch) {
        console.log("[AgencyBrain] 🔄 Syncing local Pitch to Database...");
        updates.pitch = pitch;
        hasUpdates = true;
      }

      // Check Methodology
      if (methodology && methodology !== agencyDNA.methodology) {
        console.log(
          "[AgencyBrain] 🔄 Syncing local Methodology to Database...",
        );
        updates.methodology = methodology;
        hasUpdates = true;
      }

      if (hasUpdates) {
        // Trigger save (immediate to ensure consistency before navigation)
        updateAgencyDNA(updates, true);
      }
    }
  }, [pitch, methodology, agencyDNA, currentProject?.id, updateAgencyDNA]);

  // Track record state
  const [newPastClient, setNewPastClient] = useState({
    name: "",
    description: "",
  });
  const [newDreamClient, setNewDreamClient] = useState("");
  const handleSave = async () => {
    await saveAgencyDNA();
    toast({
      title: "Données enregistrées",
      description: "Le cerveau agence a été sauvegardé",
    });
  };
  const handleWebsiteScrape = async () => {
    if (!websiteUrl) return;
    setIsScrapingWebsite(true);
    try {
      const response = await firecrawlApi.scrape(websiteUrl, {
        formats: ["markdown", "branding"],
        onlyMainContent: true,
      });
      if (response.success && response.data) {
        const updates = {
          websiteUrl,
          extractedContent: {
            ...agencyDNA.extractedContent,
            websiteContent: response.data.markdown || "",
            branding: response.data.branding,
          },
        };

        // FORCE SAVE: Trigger immediate save to Supabase to prevent data loss on reload
        try {
          // Fix: Pass the NEW data explicitly to avoid saving stale state from closure
          const freshData = { ...agencyDNA, ...updates };
          await saveAgencyDNA(freshData);
          console.log(
            "[AGENCY_BRAIN] Auto-scan data saved to database (Immediate).",
          );
        } catch (saveErr) {
          console.error("[AGENCY_BRAIN] Save failed after scan:", saveErr);
          // Don't crash the flow, we still show success
        }
        toast({
          title: "Site analysé",
          description: "Contenu extrait avec succès",
        });
      } else {
        throw new Error(response.error || "Échec de l'analyse");
      }
    } catch (error) {
      console.error("[AGENCY_BRAIN] Scrape error:", error);
      toast({
        title: "Erreur d'analyse",
        description: error instanceof Error
          ? error.message
          : "Impossible d'analyser le site web",
        variant: "destructive",
      });
    } finally {
      setIsScrapingWebsite(false);
    }
  };
  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    return fullText;
  };
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Add to temporary local state for immediate feedback
      setUploadedDocs((prev) => [...prev, {
        name: file.name,
        status: "uploading",
      }]);
      try {
        // Upload to Supabase storage
        const doc = await uploadDocument(file);
        if (doc) {
          // Also extract text locally for immediate use
          let content = "";
          if (file.type === "application/pdf") {
            content = await extractPdfText(file);
          } else {
            content = await file.text();
          }

          // Update local state
          setUploadedDocs((prev) =>
            prev.map((d) =>
              d.name === file.name
                ? {
                  ...d,
                  status: "success",
                  content,
                }
                : d
            )
          );

          // Append to extracted content for immediate AI use
          updateAgencyDNA({
            extractedContent: {
              ...agencyDNA.extractedContent,
              documents: [...(agencyDNA.extractedContent?.documents || []), {
                name: file.name,
                content,
              }],
            },
          });
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        setUploadedDocs((prev) =>
          prev.map((d) =>
            d.name === file.name
              ? {
                ...d,
                status: "error",
              }
              : d
          )
        );
      }
    }
    toast({
      title: "Documents traités",
      description: `${files.length} fichier(s) analysé(s) et sauvegardé(s)`,
    });
  }, [agencyDNA, updateAgencyDNA, toast, uploadDocument]);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);
  const addPastClient = () => {
    if (!newPastClient.name) return;
    updateAgencyDNA({
      trackRecord: {
        ...agencyDNA.trackRecord,
        pastClients: [...(agencyDNA.trackRecord?.pastClients || []), {
          ...newPastClient,
          id: crypto.randomUUID(),
        }],
      },
    });
    setNewPastClient({
      name: "",
      description: "",
    });
  };
  const addDreamClient = () => {
    if (!newDreamClient) return;
    updateAgencyDNA({
      trackRecord: {
        ...agencyDNA.trackRecord,
        dreamClients: [
          ...(agencyDNA.trackRecord?.dreamClients || []),
          newDreamClient,
        ],
      },
    });
    setNewDreamClient("");
  };
  const removePastClient = (id: string) => {
    updateAgencyDNA({
      trackRecord: {
        ...agencyDNA.trackRecord,
        pastClients: agencyDNA.trackRecord?.pastClients?.filter((c) =>
          c.id !== id
        ) || [],
      },
    });
  };
  const removeDreamClient = (index: number) => {
    updateAgencyDNA({
      trackRecord: {
        ...agencyDNA.trackRecord,
        dreamClients: agencyDNA.trackRecord?.dreamClients?.filter((_, i) =>
          i !== index
        ) || [],
      },
    });
  };
  const extractTrackRecordWithAI = async () => {
    const websiteContent = agencyDNA.extractedContent?.websiteContent || "";
    const documentsContent =
      agencyDNA.extractedContent?.documents?.map((d) => d.content).join(
        "\n\n",
      ) || "";

    // NEW: Use hunt-clients for deep client extraction if we have a website URL
    if (websiteUrl || agencyDNA.websiteUrl) {
      setIsExtractingTrackRecord(true);
      try {
        console.log("[AgencyBrain] 🎯 CLIENT HUNTER MODE - Deep extraction");

        const { data, error } = await supabase.functions.invoke(
          "hunt-clients",
          {
            body: {
              websiteUrl: websiteUrl || agencyDNA.websiteUrl,
              existingContent: websiteContent,
            },
          },
        );

        if (error) throw error;

        if (data.success && data.data) {
          const { pastClients, dreamClients, method, sources } = data.data;

          const existingPastNames = new Set(
            agencyDNA.trackRecord?.pastClients?.map((c) =>
              c.name.toLowerCase()
            ) || [],
          );
          const existingDreamNames = new Set(
            agencyDNA.trackRecord?.dreamClients?.map((c) => c.toLowerCase()) ||
              [],
          );

          const newPastClients = (pastClients || []).filter((c: any) =>
            !existingPastNames.has(c.name.toLowerCase())
          ).map((c: any) => ({
            ...c,
            id: crypto.randomUUID(),
          }));

          const newDreamClients = (dreamClients || []).filter((c: string) =>
            !existingDreamNames.has(c.toLowerCase())
          );

          updateAgencyDNA({
            trackRecord: {
              pastClients: [
                ...(agencyDNA.trackRecord?.pastClients || []),
                ...newPastClients,
              ],
              dreamClients: [
                ...(agencyDNA.trackRecord?.dreamClients || []),
                ...newDreamClients,
              ],
            },
          });

          const methodLabels: Record<string, string> = {
            "deep-crawl": "Navigation intelligente",
            "logo-extraction": "Extraction de logos",
            "google-xray": "Google X-Ray",
            "homepage": "Page d'accueil",
          };

          toast({
            title: "🎯 Track Record extrait",
            description:
              `${newPastClients.length} clients + ${newDreamClients.length} cibles via ${
                methodLabels[method] || method
              }`,
          });
          return;
        } else {
          throw new Error(data.error || "Échec de l'extraction");
        }
      } catch (error) {
        console.error("Hunt clients error:", error);
        // Fallback to legacy method
      } finally {
        setIsExtractingTrackRecord(false);
      }
    }

    // LEGACY FALLBACK: Use extract-track-record for document-only extraction
    if (!websiteContent && !documentsContent) {
      toast({
        title: "Aucun contenu",
        description:
          "Analysez d'abord votre site web ou uploadez des documents",
        variant: "destructive",
      });
      return;
    }

    setIsExtractingTrackRecord(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "extract-track-record",
        {
          body: {
            websiteContent,
            documentsContent,
            existingPitch: agencyDNA.pitch,
          },
        },
      );
      if (error) throw error;
      if (data.success && data.data) {
        const { pastClients, dreamClients } = data.data;
        const existingPastNames = new Set(
          agencyDNA.trackRecord?.pastClients?.map((c) =>
            c.name.toLowerCase()
          ) || [],
        );
        const existingDreamNames = new Set(
          agencyDNA.trackRecord?.dreamClients?.map((c) => c.toLowerCase()) ||
            [],
        );
        const newPastClients = pastClients.filter((c: any) =>
          !existingPastNames.has(c.name.toLowerCase())
        ).map((c: any) => ({
          ...c,
          id: crypto.randomUUID(),
        }));
        const newDreamClients = dreamClients.filter((c: string) =>
          !existingDreamNames.has(c.toLowerCase())
        );
        updateAgencyDNA({
          trackRecord: {
            pastClients: [
              ...(agencyDNA.trackRecord?.pastClients || []),
              ...newPastClients,
            ],
            dreamClients: [
              ...(agencyDNA.trackRecord?.dreamClients || []),
              ...newDreamClients,
            ],
          },
        });
        toast({
          title: "Track Record extrait",
          description:
            `${newPastClients.length} clients passés et ${newDreamClients.length} clients de rêve trouvés`,
        });
      } else {
        throw new Error(data.error || "Échec de l'extraction");
      }
    } catch (error) {
      console.error("Extract track record error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'extraire le track record",
        variant: "destructive",
      });
    } finally {
      setIsExtractingTrackRecord(false);
    }
  };
  const [scanStatus, setScanStatus] = useState<string>("");
  const [strategicReasoning, setStrategicReasoning] = useState<string>("");
  const handleAutoScanAndFill = async () => {
    if (!websiteUrl) {
      toast({
        title: "URL requise",
        description: "Entrez l'URL de votre site web",
        variant: "destructive",
      });
      return;
    }

    setIsAutoScanning(true);
    setProgress(5); // Petit démarrage immédiat
    setScanStatus("🤖 Lancement de l'Agent Firecrawl...");
    setStrategicReasoning("");

    try {
      // 0. Force Save to ensure DB is fresh for the Agent
      await saveAgencyDNA();
      console.log("[AgencyBrain] Forced save before scan.");

      // Step 1: Start Agent Job
      setScanStatus("🚀 Démarrage de l'analyse...");

      const { data: startData, error: startError } = await supabase.functions
        .invoke("extract-track-record", {
          body: { websiteUrl },
        });

      if (startError) {
        throw new Error(`Erreur démarrage : ${startError.message}`);
      }
      if (!startData?.success) {
        throw new Error(startData?.error || "Échec lancement job");
      }

      // HARD CACHE SUPPORT: Check for immediate completion
      let finalData = null;
      let isComplete = false;

      if (startData.status === "completed" && startData.data) {
        // CACHE HIT!
        console.log("⚡️ CACHE HIT: Results loaded immediately.");
        finalData = startData.data;
        isComplete = true;
        setScanStatus("⚡️ Données trouvées en cache !");
      } else if (startData.jobId) {
        // STANDARD FLOW: Job Started, start polling
        const jobId = startData.jobId;
        console.log(`✅ Job Started: ${jobId}`);

        // Step 2: Poll for completion (Only if not already complete)
        let attempts = 0;
        const maxAttempts = 60; // 3 min max (60 * 3s)

        while (!isComplete && attempts < maxAttempts) {
          attempts++;
          setScanStatus(`🕵️ Analyse en cours... (${attempts * 3}s)`);

          // Wait 3s
          await new Promise((r) => setTimeout(r, 3000));

          const { data: statusData, error: statusError } = await supabase
            .functions.invoke("extract-track-record", {
              body: { jobId, websiteUrl }, // Pass websiteUrl for caching
            });

          if (statusError) {
            console.warn("Poll error (retrying):", statusError);
            continue;
          }

          if (statusData?.status === "completed") {
            isComplete = true;
            finalData = statusData.data;
          }
        }
      }

      if (!finalData) {
        throw new Error("Timeout: L'analyse a pris trop de temps");
      }

      // Step 3: Extract Data
      const {
        agency_profile,
        services_summary,
        track_record,
      } = finalData;

      console.log("✅ Firecrawl Agent Results:", {
        profile: agency_profile,
        services: services_summary?.length || 0,
        clients: track_record?.length || 0,
      });

      // --- MISSION 1, 2 & SPECIAL 3: KORTEX BRAIN INTELLIGENCE ---

      // Gather documents for Mission 2 & 3
      const localDocsContent = agencyDNA.extractedContent?.documents?.map((d) =>
        d.content
      ).join("\n\n") || "";
      const persistedDocsContent = getAllExtractedContent?.() || ""; // Safe call
      const documentsContent = [localDocsContent, persistedDocsContent].filter(
        Boolean,
      ).join("\n\n---\n\n");
      const websiteContent = agencyDNA.extractedContent?.websiteContent || "";

      let dreamClientsResult = [];
      let strategyResult: any = null;
      let pitchResult: any = null;

      if (track_record?.length > 0 || documentsContent || websiteContent) {
        setScanStatus(
          "🧠 Kortex Brain : Stratégie & Rédaction Senior...",
        );

        // Parallelize Brain Missions
        const results = await Promise.all([
          // Mission 1: Dream Clients (if we have track record)
          track_record?.length > 0
            ? supabase.functions.invoke("kortex-brain", {
              body: {
                mode: "dream_clients_deduction",
                pastClients: track_record,
              },
            })
            : Promise.resolve({ data: { dreamClients: [] } }),

          // Mission 2: Strategic Ingestion (Target Def)
          (documentsContent || websiteContent)
            ? supabase.functions.invoke("kortex-brain", {
              body: {
                mode: "strategic_ingestion",
                documentsContent,
                websiteContent,
                pastClients: track_record || [],
              },
            })
            : Promise.resolve({ data: null }),

          // MISSION 3: PITCH & METHODOLOGY SPECIALIST
          (documentsContent || websiteContent)
            ? supabase.functions.invoke("generate-agency-pitch", {
              body: { documentsContent, websiteContent },
            })
            : Promise.resolve({ data: null }),

          // MISSION 4 [NEW]: DEFINE ICP (Targeting, Pain Points, Tech)
          (documentsContent || websiteContent)
            ? supabase.functions.invoke("define-icp", {
              body: { projectId: currentProject?.id },
            })
            : Promise.resolve({ data: null }),
        ]);

        const dreamClientsResponse = results[0];
        const strategyResponse = results[1];
        const pitchResponse = results[2];
        const icpResponse = results[3];

        if (dreamClientsResponse.data?.dreamClients) {
          dreamClientsResult = dreamClientsResponse.data.dreamClients;
        }
        if (strategyResponse.data) {
          strategyResult = strategyResponse.data;
        }
        if (pitchResponse.data) {
          pitchResult = pitchResponse.data;
        }

        // Process ICP Results
        if (icpResponse.data) {
          const icpData = icpResponse.data;
          console.log("🧠 ICP Data:", icpData);

          const targetUpdates: any = {};

          if (icpData.pain_points) {
            targetUpdates.painPoints = icpData.pain_points;
          }
          if (icpData.tech_requirements) {
            targetUpdates.techRequirements = icpData.tech_requirements;
          }

          // Attempt to map Industries (Secteurs)
          // Note: This is a loose mapping as strings might not match Enums perfectly.
          // For now, we only update strict fields if we can invalidly cast or if we trust the AI to return compatible strings.
          // The prompt asked for French strings. The Enums are English values with French labels.
          // We will strictly update painPoints and techRequirements for now as requested.

          if (Object.keys(targetUpdates).length > 0) {
            updateTargetCriteria(targetUpdates);
          }
        }
      }

      // --- FINAL UPDATES MERGE ---
      const updates: any = {};

      // 1. Agency Profile (from Firecrawl) - BASIC INFO ONLY
      if (agency_profile) {
        if (agency_profile.tagline || agency_profile.target_audience) {
          updates.extractedContent = {
            ...agencyDNA.extractedContent,
            agencyTagline: agency_profile.tagline,
            targetAudience: agency_profile.target_audience,
          };
        }
        // NOTE: We intentionally IGNORE Firecrawl's value_proposition for the main pitch field
        // to prioritize the high-quality generate-agency-pitch result.
      }

      // [NEW] Specialized Pitch & Methodology (Overrides everything)
      if (pitchResult) {
        if (pitchResult.pitch) {
          updates.pitch = pitchResult.pitch;
          // FIX: Auto-Fill UI immediately
          setPitch(pitchResult.pitch);
        }
        if (pitchResult.methodology) {
          updates.methodology = pitchResult.methodology;
          // FIX: Auto-Fill UI immediately
          setMethodology(pitchResult.methodology);
        }
      } // Fallback: If specialized pitch failed but strategy/Firecrawl exists
      else {
        if (strategyResult?.additional_context?.pitch) {
          updates.pitch = strategyResult.additional_context.pitch;
        } else if (agency_profile?.value_proposition && !agencyDNA.pitch) {
          // Last resort fallback
          updates.pitch = agency_profile.value_proposition;
        }

        if (strategyResult?.additional_context?.methodology) {
          updates.methodology = strategyResult.additional_context.methodology;
        }
      }

      // Mission 2: Target Definition
      if (strategyResult?.target_definition) {
        updates.targetCriteria = {
          ...targetCriteria,
          ...strategyResult.target_definition,
        };
        // Fix key mapping logic...
        if (strategyResult.target_definition.company_size) {
          updates.targetCriteria.headcount =
            strategyResult.target_definition.company_size;
        }
        if (strategyResult.target_definition.seniority_level) {
          updates.targetCriteria.seniority =
            strategyResult.target_definition.seniority_level;
        }
        // Qualification Rules
        if (strategyResult.qualification_criteria_rules) {
          updates.targetCriteria.customSignals =
            strategyResult.qualification_criteria_rules;
        }
      }

      // 2. Services (from Firecrawl)
      if (services_summary?.length > 0) {
        updates.extractedContent = {
          ...updates.extractedContent,
          ...agencyDNA.extractedContent, // Merge safe
          services: services_summary,
        };
      }

      // 3. Track Record (Mission 1 & Firecrawl)
      const combinedDreamClients = [
        ...(agencyDNA.trackRecord?.dreamClients || []),
        ...dreamClientsResult,
      ];
      // Deduplicate Dream Clients
      const uniqueDreamClients = Array.from(new Set(combinedDreamClients));

      if (track_record?.length > 0 || uniqueDreamClients.length > 0) {
        // Deduplicate Past Clients
        const existingNames = new Set(
          agencyDNA.trackRecord?.pastClients?.map((c) =>
            c.name.toLowerCase().trim()
          ) || [],
        );

        const newClients = (track_record || [])
          .filter((client) =>
            !existingNames.has(client.company_name.toLowerCase().trim())
          )
          .map((client) => ({
            id: crypto.randomUUID(),
            name: client.company_name,
            description: client.context ||
              `Secteur: ${client.industry || "Non spécifié"}`,
          }));

        updates.trackRecord = {
          pastClients: [
            ...(agencyDNA.trackRecord?.pastClients || []),
            ...newClients,
          ],
          dreamClients: uniqueDreamClients,
        };
      }

      // Update Agency DNA with all extracted data
      if (Object.keys(updates).length > 0) {
        const finalUpdates = { ...updates, websiteUrl };
        updateAgencyDNA(finalUpdates);

        // FORCE SAVE: Trigger immediate save to Supabase to prevent data loss on reload
        try {
          const freshData = { ...agencyDNA, ...finalUpdates };
          await saveAgencyDNA(freshData);
          console.log(
            "[AGENCY_BRAIN] Auto-scan (TrackRecord) saved to database (Immediate).",
          );
        } catch (saveErr) {
          console.error("[AGENCY_BRAIN] Save failed after scan:", saveErr);
        }
      }

      // Build success message
      const filledFields = [];
      if (updates.extractedContent?.agencyTagline) {
        filledFields.push("tagline");
      }
      if (updates.pitch) {
        filledFields.push("proposition de valeur");
      }
      if (updates.extractedContent?.targetAudience) {
        filledFields.push("cible");
      }
      if (updates.extractedContent?.services) {
        filledFields.push(`${services_summary.length} services`);
      }
      if (updates.trackRecord) {
        const newCount = updates.trackRecord.pastClients.length -
          (agencyDNA.trackRecord?.pastClients?.length || 0);
        filledFields.push(`${newCount} clients`);
      }

      setScanStatus("");

      // SUCCÈS ! ON FORCE LA BARRE À 100%
      setProgress(100);

      // On attend 600ms pour que l'utilisateur voie le "100%" avant d'afficher le résultat
      setTimeout(() => {
        setIsAutoScanning(false);
        toast({
          title: "✨ Agent Firecrawl : Analyse terminée",
          description: filledFields.length > 0
            ? `Rempli automatiquement : ${filledFields.join(", ")}`
            : "Analyse complète - données déjà présentes",
        });
      }, 800);
    } catch (error) {
      console.error("Auto-scan error:", error);
      setScanStatus("");
      setIsAutoScanning(false); // Arrête la barre immédiatement en cas d'erreur
      toast({
        title: "Erreur d'analyse",
        description: error instanceof Error
          ? error.message
          : "Impossible d'analyser le site",
        variant: "destructive",
      });
    }
  };
  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <CommandHeader
          title="Cerveau Agence"
          subtitle="Nourrissez l'IA avec votre ADN unique"
          icon={Brain}
          actions={
            <div className="flex items-center gap-3">
              <AutoSaveIndicator
                status={agencyDNAStatus}
                lastSavedAt={lastSavedAt}
              />
              {!isAutoScanning && (
                <Button
                  onClick={handleAutoScanAndFill}
                  disabled={isAutoScanning ||
                    (!websiteUrl &&
                      uploadedDocs.length === 0 &&
                      documents.length === 0)}
                  variant="outline"
                  className="gap-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-300 text-xs font-mono uppercase tracking-wider"
                >
                  <Wand2 className="h-3 w-3" />
                  Auto-Scan
                </Button>
              )}
              <SaveButton onSave={handleSave} isSaving={isSaving} />
            </div>
          }
        />

        {/* Progress Bar (Kortex Guedin Bar) - Replaces the button/loader status */}
        {isAutoScanning && (
          <div className="w-full flex justify-center py-4">
            <KortexProgressBar progress={progress} />
          </div>
        )}

        {/* Scan Status & Strategic Reasoning (Only show Reasoning if not scanning/progress bar active, or if we want to update text below bar) */}
        {(strategicReasoning && !isAutoScanning) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              {strategicReasoning && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Raisonnement Stratégique
                  </div>
                  <p className="text-foreground">{strategicReasoning}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Website Scraping */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Site Web
            </CardTitle>
            <CardDescription>
              L'IA analysera votre site pour comprendre votre activité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="https://votre-agence.com"
                value={websiteUrl}
                onChange={(e) =>
                  updateAgencyDNA({ websiteUrl: e.target.value })}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  handleWebsiteScrape();
                }}
                disabled={!websiteUrl || isScrapingWebsite}
              >
                {isScrapingWebsite
                  ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyse...
                    </>
                  )
                  : "Analyser"}
              </Button>
            </div>
            {agencyDNA.extractedContent?.websiteContent && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Site analysé
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Feed The Brain - Incitation à l'upload */}
        <div className="relative overflow-hidden rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <BrainCircuit className="h-5 w-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-200">
                La puissance de Kortex dépend de votre contexte.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Plus vous nourrissez l'IA, plus le ciblage sera chirurgical.
                N'hésitez pas à importer vos anciennes présentations, études de
                cas complètes, et archives techniques. Kortex lit chaque ligne
                pour détecter des opportunités invisibles à l'œil nu.
              </p>
            </div>
          </div>
        </div>

        {/* Document Upload */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Documents
            </CardTitle>
            <CardDescription>
              Déposez vos PDFs, PPTX, DOCX - Plans POD, propositions gagnantes,
              méthodologies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
            >
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-1">
                  Déposez votre Cerveau ici
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, PPTX, DOCX, TXT acceptés
                </p>
              </label>
            </div>

            {/* Saved Documents from Database */}
            {documents.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Cloud className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">
                    Documents enregistrés ({documents.length})
                  </span>
                </div>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Cloud className="h-4 w-4 text-emerald-500" />
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {doc.file_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {doc.file_type.toUpperCase()}
                      </Badge>
                      {doc.extraction_status === "completed" && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Texte extrait
                        </Badge>
                      )}
                      {doc.extraction_status === "processing" && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Extraction...
                        </Badge>
                      )}
                      {doc.extraction_status === "failed" && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Échec
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDocument(doc.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Temporary upload feedback */}
            {uploadedDocs.length > 0 && (
              <div className="mt-4 space-y-2">
                <span className="text-sm text-muted-foreground">
                  Uploads en cours
                </span>
                {uploadedDocs.filter((doc) => doc.status === "uploading").map((
                  doc,
                  i,
                ) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">{doc.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Track Record - Past Clients */}
        <Card className="border-border shadow-soft">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Track Record</CardTitle>
              <CardDescription>
                Avec qui avez-vous déjà travaillé ? L'IA calibrera le ciblage.
              </CardDescription>
            </div>
            <Button
              onClick={extractTrackRecordWithAI}
              disabled={isExtractingTrackRecord ||
                !agencyDNA.extractedContent?.websiteContent &&
                  !agencyDNA.extractedContent?.documents?.length}
              variant="outline"
              className="gap-2"
            >
              {isExtractingTrackRecord
                ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extraction...
                  </>
                )
                : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Extraire avec l'IA
                  </>
                )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Clients passés</Label>
              <div className="flex gap-3">
                <Input
                  placeholder="Nom du client"
                  value={newPastClient.name}
                  onChange={(e) =>
                    setNewPastClient((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))}
                  className="flex-1"
                />
                <Input
                  placeholder="Ce que vous avez fait"
                  value={newPastClient.description}
                  onChange={(e) =>
                    setNewPastClient((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))}
                  className="flex-1"
                />
                <Button onClick={addPastClient} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {agencyDNA.trackRecord?.pastClients?.map((client) => (
                  <Badge
                    key={client.id}
                    variant="secondary"
                    className="gap-2 py-1.5 px-3"
                  >
                    <span className="font-medium">{client.name}</span>
                    {client.description && (
                      <span className="text-muted-foreground">
                        • {client.description}
                      </span>
                    )}
                    <button
                      onClick={() => removePastClient(client.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Clients de rêve (que vous n'avez pas encore)</Label>
              <div className="flex gap-3">
                <Input
                  placeholder="Ex: L'Oréal, LVMH, BNP..."
                  value={newDreamClient}
                  onChange={(e) => setNewDreamClient(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addDreamClient} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {agencyDNA.trackRecord?.dreamClients?.map((client, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="gap-2 py-1.5 px-3"
                  >
                    {client}
                    <button
                      onClick={() => removeDreamClient(i)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Context */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>Contexte Additionnel</CardTitle>
            <CardDescription>
              Ajoutez des informations que l'IA n'aurait pas pu déduire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pitch / Proposition de valeur</Label>
              <Textarea
                placeholder="Ex: Nous aidons les E-commerçants à doubler leur CA..."
                className="min-h-[100px] resize-none border-border/50 focus:border-violet-500 transition-all font-light"
                value={pitch} // <-- Variable UNIQUE Pitch
                onChange={(e) => setPitch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Méthodologie / Process signature</Label>
              <Textarea
                placeholder="Ex: Audit 360 -> Stratégie -> Implémentation..."
                value={methodology} // <-- Variable UNIQUE Methodo
                onChange={(e) => setMethodology(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

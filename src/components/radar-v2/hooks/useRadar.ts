import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  AnalysisResult,
  Company,
  DecisionMaker,
  FindDecisionMakerResult,
  TargetingAnalysis,
} from "../types";

interface ProjectContext {
  hasPdf: boolean;
  hasSite: boolean;
  hasTarget: boolean;
}

import { usePOD } from "@/contexts/PODContext";

export function useRadar() {
  const { currentProject } = useProject();
  const { saveAgencyDNA, saveTargetCriteria } = usePOD();
  const { toast } = useToast();
  const { session, ensureSession } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState<
    "idle" | "analyzing" | "searching" | "validating" | "complete" | "error"
  >("idle");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFindingDecisionMaker, setIsFindingDecisionMaker] = useState(false);

  const scanChannelRef = useRef<any>(null);

  // Fetch project context (DNA) to check what's configured
  const { data: projectData } = useQuery({
    queryKey: ["project-data", currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;

      const { data, error } = await supabase
        .from("project_data")
        .select("*")
        .eq("project_id", currentProject.id);

      if (error) {
        console.error("Error fetching project data:", error);
        return null;
      }

      return data;
    },
    enabled: !!currentProject?.id,
  });

  // Compute project context status
  const projectContext = useMemo<ProjectContext>(() => {
    if (!projectData) {
      return { hasPdf: false, hasSite: false, hasTarget: false };
    }

    const agencyDNA = projectData.find((d) => d.data_type === "agency_dna")
      ?.data as Record<string, any> | undefined;
    const targetDef = projectData.find((d) =>
      d.data_type === "target_definition"
    )?.data as Record<string, any> | undefined;

    return {
      hasPdf: !!(agencyDNA?.extractedContent),
      hasSite: !!agencyDNA?.websiteUrl,
      hasTarget:
        !!(targetDef || agencyDNA?.trackRecord?.dreamClients?.length > 0),
    };
  }, [projectData]);

  // Fetch companies from company_analyses table
  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ["radar-companies", currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from("company_analyses")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("match_score", { ascending: false });

      if (error) {
        console.error("Error fetching companies:", error);
        return [];
      }

      return (data || []).map((row) => {
        // Parse decision maker, alternative contact, and match origin from custom_hook
        let decisionMaker = undefined;
        let alternativeContact = undefined;
        let targetingAnalysis = undefined;
        let validatedByCible = false;
        let validatedByCerveau = false;
        let matchReason = row.match_explanation;

        if (row.custom_hook) {
          try {
            const hookData = typeof row.custom_hook === "string"
              ? JSON.parse(row.custom_hook)
              : row.custom_hook;

            // PRECISION ENGINE V3: Primary Contact
            if (hookData?.decisionMaker || hookData?.primaryContact) {
              const dm = hookData.primaryContact || hookData.decisionMaker;
              decisionMaker = {
                firstName: dm.firstName,
                lastName: dm.lastName,
                fullName: dm.fullName,
                email: dm.email,
                linkedinUrl: dm.linkedinUrl,
                jobTitle: dm.jobTitle,
                confidenceScore: dm.confidenceScore,
                matchScore: dm.matchScore,
                matchReason: dm.matchReason,
                whyThisRole: dm.whyThisRole,
                scoreBreakdown: dm.scoreBreakdown,
              };
            }

            // PRECISION ENGINE V3: Alternative Contact
            if (hookData?.alternativeContact) {
              const alt = hookData.alternativeContact;
              alternativeContact = {
                firstName: alt.firstName,
                lastName: alt.lastName,
                fullName: alt.fullName,
                email: alt.email,
                linkedinUrl: alt.linkedinUrl,
                jobTitle: alt.jobTitle,
                matchScore: alt.matchScore,
                matchReason: alt.matchReason,
                whyThisRole: alt.whyThisRole,
                scoreBreakdown: alt.scoreBreakdown,
              };
            }

            // PRECISION ENGINE V3: Targeting Analysis
            if (hookData?.targetingAnalysis) {
              targetingAnalysis = hookData.targetingAnalysis;
            }

            // ZERO-DÉCHET: Extract match origin
            if (hookData?.validatedByCible !== undefined) {
              validatedByCible = hookData.validatedByCible;
            }
            if (hookData?.validatedByCerveau !== undefined) {
              validatedByCerveau = hookData.validatedByCerveau;
            }
            if (hookData?.matchReason) {
              matchReason = hookData.matchReason;
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }

        return {
          id: row.id,
          name: row.company_name,
          website: row.company_url ? `https://${row.company_url}` : undefined,
          domain: row.company_url,
          logoUrl: row.logo_url,
          industry: row.industry,
          headcount: row.headcount,
          location: row.location,
          score: row.match_score || 0,
          status: (row.match_score || 0) >= 85
            ? "hot"
            : (row.match_score || 0) >= 70
            ? "warm"
            : "cold",
          signals: Array.isArray(row.buying_signals) ? row.buying_signals : [],
          tags: row.industry ? [row.industry] : [],
          descriptionLong: row.description_long,
          painPoints: Array.isArray(row.detected_pain_points)
            ? row.detected_pain_points
            : [],
          buyingSignals: Array.isArray(row.buying_signals)
            ? row.buying_signals
            : [],
          strategicAnalysis: row.strategic_analysis,
          customHook: typeof row.custom_hook === "string" &&
              !row.custom_hook.startsWith("{")
            ? row.custom_hook
            : undefined,
          matchExplanation: row.match_explanation,
          analysisStatus: row.analysis_status as Company["analysisStatus"],
          analyzedAt: row.analyzed_at,
          decisionMaker,
          alternativeContact, // PRECISION ENGINE V3
          targetingAnalysis, // PRECISION ENGINE V3
          // ZERO-DÉCHET: Match origin
          validatedByCible,
          validatedByCerveau,
          matchReason,
        };
      }) as Company[];
    },
    enabled: !!currentProject?.id,
  });

  // Real-time subscription for company_analyses
  useEffect(() => {
    if (!currentProject?.id) return;

    const channel = supabase
      .channel("radar-companies-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_analyses",
          filter: `project_id=eq.${currentProject.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["radar-companies", currentProject.id],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProject?.id, queryClient]);

  // Open company detail sheet
  const openCompanySheet = useCallback((company: Company) => {
    console.log("🔥 CLIC DÉTECTÉ SUR :", company.name);
    setSelectedCompany(company);
    setIsSheetOpen(true);
  }, []);

  // Close company detail sheet
  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    setSelectedCompany(null);
  }, []);

  // Simulated Progress Logic
  useEffect(() => {
    if (!isScanning) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      setScanProgress((prev) => {
        if (elapsed < 3000) {
          setScanStep("analyzing");
          return Math.min(15, (elapsed / 3000) * 15); // 0 à 15% en 3s (Analyse)
        } else if (elapsed < 25000) {
          setScanStep("searching");
          return Math.min(75, 15 + ((elapsed - 3000) / 22000) * 60); // 15 à 75% (Recherche)
        } else {
          setScanStep("validating"); // "Analyse IA"
          return Math.min(85, prev + 0.1);
        }
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isScanning]);

  // Scan market using the new 4-phase discovery engine
  const scanMarket = useCallback(
    async (options?: { forceRefresh?: boolean; strategy?: string }) => {
      /* OPEN CIRCUIT MODE: Project check disabled
      if (!currentProject?.id) {
        toast({
          title: "Projet requis",
          description:
            "Veuillez sélectionner un projet avant de lancer la découverte",
          variant: "destructive",
        });
        return;
      }
      */

      if (scanChannelRef.current) {
        supabase.removeChannel(scanChannelRef.current);
        scanChannelRef.current = null;
      }

      // RESET EVERYTHING
      setIsScanning(true);
      setScanProgress(0);
      setScanStep("analyzing");

      try {
        // Self-healing session retrieval
        let currentSession = session;
        /* OPEN CIRCUIT MODE: Session check disabled
        if (!currentSession) {
          toast({ title: "Session expirée", description: "Rechargement…" });
          window.location.reload();
          return;
        }
        */

        // 0. RELAXED: We trust the AI to figure it out or the backend to handle defaults.
        console.log(
          "[Radar] Starting scan with context (Pre-flight check removed):",
          projectContext,
        );

        const payload = {
          projectId: currentProject.id,
          force_refresh: options?.forceRefresh,
          strategy: options?.strategy,
          // AUDIT: Injecting project context for debugging
          ...projectContext,
        };

        console.log(
          "📝 [AUDIT INPUT] PAYLOAD TO BACKEND:",
          JSON.stringify(payload, null, 2),
        );

        // DEEP REASONING CALL
        const { data, error } = await supabase.functions.invoke(
          "discover-companies",
          {
            body: payload,
            headers: { Authorization: `Bearer ${currentSession.access_token}` },
          },
        );

        if (error) throw error; // Network/Edge function crash

        // HANDLE LOGIC ERRORS (400 Bad Request from missing context)
        if (!data?.success) {
          setIsScanning(false);
          setScanProgress(0); // RESET ON ERROR

          // DIAGNOSTIC CRASH TEST FEEDBACK
          if (data?.code === "DIAGNOSTIC_FAIL") {
            setScanStep("error");
            toast({
              title: "🚨 Échec du Diagnostic",
              description: data.error +
                (data.details ? `\n${data.details}` : ""),
              variant: "destructive",
              duration: 8000,
            });
            return;
          }

          throw new Error(data?.error || "Erreur inconnue");
        }

        // Save DEDUCED companies to database
        if (data.companies && data.companies.length > 0) {
          console.log("🔍 FRONTEND RECEIVED:", data.companies);

          const companiesToInsert = data.companies.map((company: any) => ({
            user_id: currentSession!.user.id,
            project_id: currentProject.id,
            company_name: company.name,
            // FALLBACK: Generate unique URL to prevent upsert collision if website is missing
            company_url: company.website ||
              `missing-url-${crypto.randomUUID()}.com`,
            match_score: company.score,
            match_explanation: company.reasoning,
            analysis_status: "deduced", // NEW STATUS
            // We store the reasoning as the initial hook/source of truth
            custom_hook: JSON.stringify({
              validatedByCerveau: true,
              matchReason: company.reasoning,
              deducedAt: new Date().toISOString(),
              originalWebsite: company.website || "Not Identified",
            }),
          }));

          console.log("🔍 FRONTEND INSERTING:", companiesToInsert);

          // BATCH INSERT instead of loop for atomicity and performance
          const { error: insertError } = await supabase
            .from("company_analyses")
            .upsert(companiesToInsert, {
              onConflict: "project_id,company_url",
              ignoreDuplicates: true,
            });

          if (insertError) {
            console.error("🚨 FRONTEND INSERT ERROR:", insertError);
            toast({
              title: "Erreur de sauvegarde",
              description: "Impossible de sauvegarder les résultats: " +
                insertError.message,
              variant: "destructive",
            });
          } else {
            console.log("✅ FRONTEND INSERT SUCCESS");
          }

          // IMMEDIATE FEEDBACK: Show them
          toast({
            title: "🧠 Analyse Stratégique Terminée",
            description:
              `${data.companies.length} cibles identifiées par déduction.`,
          });

          refetch();
          triggerEnrichmentLoop(data.companies);
        } else {
          toast({
            title: "Aucune cible déduite",
            description:
              "Le contexte ne permet pas de déduire des cibles précises.",
            variant: "default",
          });
        }

        setScanProgress(100);
        setScanStep("complete");
        setIsScanning(false);
      } catch (error) {
        console.error("[RADAR] Deep Reasoning error:", error);
        setScanStep("error");
        setScanProgress(0); // RESET ON ERROR
        setIsScanning(false);
        toast({
          title: "Erreur de raisonnement",
          description: error instanceof Error
            ? error.message
            : "Erreur inconnue",
          variant: "destructive",
        });
      }
    },
    [currentProject?.id, session, ensureSession, toast, refetch],
  );

  // Trigger Enrichment Loop for the deduced companies
  const triggerEnrichmentLoop = async (companies: any[]) => {
    console.log(
      "🚀 Starting Enrichment Loop for",
      companies.length,
      "companies",
    );

    // Use Promise.allSettled to handle multiple async operations safely without crashing
    const enrichmentPromises = companies.map(async (company, index) => {
      // Stagger to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, index * 1000));

      try {
        toast({
          title: "Enrichissement en cours...",
          description: `Recherche d'infos pour ${company.name}`,
          duration: 2000,
        });

        await supabase.functions.invoke("enrich-company", {
          body: {
            companyName: company.name,
            companyUrl: company.website,
            projectId: currentProject?.id,
          },
        });

        // We refetch after each successful enrichment to update UI incrementally
        // However, invalidating queries too frequently can be bad.
        // Better to invalidate once at the end or in batches, but for now we keep behavior.
        // We will catch errors so one failure doesn't stop others.
      } catch (e) {
        console.error(`Failed to enrich ${company.name}`, e);
        // Does not re-throw, so other items continue
      }
    });

    // Await all efficiently
    await Promise.allSettled(enrichmentPromises);

    // Final refresh
    refetch();

    toast({
      title: "Vérification terminée",
      description: "Kortex a vérifié toutes les cibles.",
    });
  };

  // Analyze a specific company with Firecrawl
  const analyzeCompany = useCallback(
    async (company: Company): Promise<AnalysisResult | null> => {
      if (!currentProject?.id || !company.website) {
        toast({
          title: "Données manquantes",
          description: "URL de l'entreprise requise pour l'analyse",
          variant: "destructive",
        });
        return null;
      }

      setIsAnalyzing(true);

      try {
        console.log("[RADAR] 🔍 Analyzing company:", company.name);

        const { data, error } = await supabase.functions.invoke(
          "analyze-company-deep",
          {
            body: {
              companyName: company.name,
              companyUrl: company.website,
              projectId: currentProject.id,
            },
          },
        );

        if (error) throw error;

        const analysis = data.analysis;

        // Feedback for Cache Hit (Optimistic UI)
        if (data.cached) {
          toast({
            title: "⚡️ Analyse instantanée",
            description: "Résultat chargé depuis la mémoire cache",
            duration: 2000,
            className: "bg-emerald-50 border-emerald-200 text-emerald-800",
          });
        }

        // Update selected company with new data
        if (selectedCompany?.id === company.id) {
          setSelectedCompany({
            ...selectedCompany,
            descriptionLong: analysis.description_long,
            painPoints: analysis.detected_pain_points || [],
            buyingSignals: analysis.buying_signals || [],
            strategicAnalysis: analysis.strategic_analysis,
            customHook: analysis.custom_hook,
            matchExplanation: analysis.match_explanation,
            score: analysis.match_score,
            logoUrl: analysis.logo_url,
            analysisStatus: "completed",
          });
        }

        refetch();

        return {
          descriptionLong: analysis.description_long,
          painPoints: analysis.detected_pain_points || [],
          buyingSignals: analysis.buying_signals || [],
          strategicAnalysis: analysis.strategic_analysis,
          customHook: analysis.custom_hook,
          matchScore: analysis.match_score,
          matchExplanation: analysis.match_explanation,
          logoUrl: analysis.logo_url,
        };
      } catch (error) {
        console.error("[RADAR] Analysis error:", error);
        toast({
          title: "Erreur d'analyse",
          description: error instanceof Error
            ? error.message
            : "Impossible d'analyser l'entreprise",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [currentProject?.id, selectedCompany, toast, refetch],
  );

  // Find decision maker using PRECISION CONTACT ENGINE V3
  const findDecisionMaker = useCallback(
    async (company: Company): Promise<FindDecisionMakerResult | null> => {
      if (!company.domain && !company.website) {
        toast({
          title: "Domaine manquant",
          description:
            "L'URL de l'entreprise est requise pour trouver le décideur",
          variant: "destructive",
        });
        return null;
      }

      setIsFindingDecisionMaker(true);

      try {
        console.log(
          "[RADAR] 🎯 PRECISION ENGINE V3: Finding decision makers for:",
          company.name,
        );

        // Use the PRECISION CONTACT ENGINE
        const { data, error } = await supabase.functions.invoke(
          "sniper-decision-maker",
          {
            body: {
              companyName: company.name,
              companyUrl: company.website || company.domain,
              projectId: currentProject?.id,
            },
          },
        );

        if (error) throw error;

        if (data.success) {
          // 👑 PRIMARY CONTACT (Le Décideur)
          const primaryDm: DecisionMaker | undefined =
            data.primaryContact || data.decisionMaker
              ? {
                firstName:
                  (data.primaryContact || data.decisionMaker).firstName,
                lastName: (data.primaryContact || data.decisionMaker).lastName,
                fullName: (data.primaryContact || data.decisionMaker).fullName,
                linkedinUrl:
                  (data.primaryContact || data.decisionMaker).linkedinUrl,
                jobTitle: (data.primaryContact || data.decisionMaker).jobTitle,
                matchScore:
                  (data.primaryContact || data.decisionMaker).matchScore,
                matchReason:
                  (data.primaryContact || data.decisionMaker).matchReason,
                whyThisRole:
                  (data.primaryContact || data.decisionMaker).whyThisRole ||
                  data.targetingAnalysis?.primaryReason,
                scoreBreakdown:
                  (data.primaryContact || data.decisionMaker).scoreBreakdown,
                confidenceScore:
                  (data.primaryContact || data.decisionMaker).matchScore,
              }
              : undefined;

          // 🛡️ ALTERNATIVE CONTACT (Le Relais)
          const alternativeDm: DecisionMaker | undefined =
            data.alternativeContact
              ? {
                firstName: data.alternativeContact.firstName,
                lastName: data.alternativeContact.lastName,
                fullName: data.alternativeContact.fullName,
                linkedinUrl: data.alternativeContact.linkedinUrl,
                jobTitle: data.alternativeContact.jobTitle,
                matchScore: data.alternativeContact.matchScore,
                matchReason: data.alternativeContact.matchReason,
                whyThisRole: data.alternativeContact.whyThisRole ||
                  data.targetingAnalysis?.alternativeReason,
                scoreBreakdown: data.alternativeContact.scoreBreakdown,
              }
              : undefined;

          // Targeting Analysis
          const targetingAnalysis: TargetingAnalysis | undefined =
            data.targetingAnalysis;

          // Update selected company with both contacts
          if (selectedCompany?.id === company.id) {
            setSelectedCompany({
              ...selectedCompany,
              decisionMaker: primaryDm,
              alternativeContact: alternativeDm,
              targetingAnalysis,
            });
          }

          // Update in database with PRECISION ENGINE data
          if (company.id) {
            const hookData = {
              primaryContact: primaryDm,
              alternativeContact: alternativeDm,
              targetingAnalysis,
              decisionMaker: primaryDm, // Legacy compatibility
              targetJobTitles: data.targetJobTitles,
              searchPhases: data.searchPhases,
            };

            await supabase
              .from("company_analyses")
              .update({ custom_hook: JSON.stringify(hookData) })
              .eq("id", company.id);
          }

          // Toast with both contacts info
          const altInfo = alternativeDm
            ? ` | Alternative: ${alternativeDm.fullName}`
            : "";
          toast({
            title: `🎯 ${
              primaryDm ? "👑 Décideur" : "🛡️ Alternative"
            } identifié`,
            description: primaryDm
              ? `${primaryDm.fullName} - ${primaryDm.jobTitle}${altInfo}`
              : alternativeDm
              ? `${alternativeDm.fullName} - ${alternativeDm.jobTitle}`
              : "Aucun contact qualifié",
          });

          return {
            success: true,
            primaryContact: primaryDm,
            alternativeContact: alternativeDm,
            targetingAnalysis,
            decisionMaker: primaryDm, // Legacy
            alternatives: alternativeDm
              ? [{
                fullName: alternativeDm.fullName,
                jobTitle: alternativeDm.jobTitle,
                linkedinUrl: alternativeDm.linkedinUrl,
              }]
              : undefined,
            targetJobTitles: data.targetJobTitles,
            searchPhases: data.searchPhases,
          };
        } else {
          const errorMsg = data.error || "Aucun profil qualifié trouvé";

          toast({
            title: "Aucun décideur qualifié",
            description: `${errorMsg}. Rejetés: ${
              data.searchPhases?.phase2?.candidatesRejected || 0
            }`,
            variant: "destructive",
          });

          return {
            success: false,
            error: errorMsg,
            targetJobTitles: data.targetJobTitles,
            searchPhases: data.searchPhases,
            targetingAnalysis: data.targetingAnalysis,
          };
        }
      } catch (error) {
        console.error("[RADAR] PRECISION ENGINE error:", error);
        toast({
          title: "Erreur de recherche",
          description: error instanceof Error
            ? error.message
            : "Impossible de trouver les décideurs",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsFindingDecisionMaker(false);
      }
    },
    [selectedCompany, currentProject?.id, toast],
  );

  return {
    // Data
    companies,
    selectedCompany,
    isLoading,

    // Sheet state
    isSheetOpen,
    openCompanySheet,
    closeSheet,

    // Scan state
    isScanning,
    scanProgress,
    scanStep,
    scanMarket,

    // Analysis state
    isAnalyzing,
    analyzeCompany,

    // Decision maker state
    isFindingDecisionMaker,
    findDecisionMaker,

    // Clear companies manually (for Tabula Rasa)
    clearCompanies: () => {
      queryClient.setQueryData(["radar-companies", currentProject?.id], []);
    },

    // 🧪 FORCE VISIBILITY TEST: Verify if frontend can display ANY card
    injectTestCard: () => {
      console.log("🧪 INJECTING TEST CARD...");
      const testCard: Company = {
        id: "test-card-" + Date.now(),
        name: "TEST COMPANY - " + new Date().toLocaleTimeString(),
        website: "https://example.com",
        domain: "example.com",
        score: 99,
        status: "hot",
        matchReason: "This is a forced test card to verify UI rendering.",
        analysisStatus: "deduced",
        signals: ["Test Signal 1", "Test Signal 2"],
        painPoints: ["Test Pain Point"],
        buyingSignals: ["Test Buying Signal"],
        descriptionLong: "This is a dummy description for the test card.",
        customHook: "{}",
      };

      queryClient.setQueryData(
        ["radar-companies", currentProject?.id],
        (old: Company[] = []) => [testCard, ...old],
      );
      toast({
        title: "Carte Test Injectée",
        description: "Vérifiez si elle s'affiche.",
      });
    },

    // Utils
    refetch,
    projectId: currentProject?.id,
    projectName: currentProject?.name,
    projectContext,
  };
}

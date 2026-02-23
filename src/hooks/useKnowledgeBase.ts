import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "@/hooks/use-toast";

export interface KnowledgeDocument {
  id: string;
  org_id: string;
  file_name: string;
  file_url: string;
  summary: string | null;
  doc_type: string;
  extracted_data: Record<string, any>;
  processing_status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export function useKnowledgeBase() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Track project changes to reset state
  const lastProjectIdRef = useRef<string | null>(null);

  // Fetch user's org_id
  useEffect(() => {
    async function fetchOrgId() {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (profile?.org_id) {
        setOrgId(profile.org_id);
      }
    }

    fetchOrgId();
  }, [user]);

  // PROJECT ISOLATION: Reset documents when project changes
  useEffect(() => {
    const currentProjectId = currentProject?.id ?? null;

    if (
      lastProjectIdRef.current !== null &&
      lastProjectIdRef.current !== currentProjectId
    ) {
      console.log("[KnowledgeBase] Project changed, resetting documents");
      setDocuments([]);
      setIsLoading(true); // Force reload
    }

    lastProjectIdRef.current = currentProjectId;
  }, [currentProject?.id]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!orgId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as KnowledgeDocument[]);
    } catch (error) {
      console.error("Error fetching knowledge documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      fetchDocuments();
    }
  }, [orgId, fetchDocuments]);

  // Upload document
  const uploadDocument = async (
    file: File,
    docType: "pitch_deck" | "price_list" | "case_study" | "proposal" | "other" =
      "pitch_deck",
  ): Promise<KnowledgeDocument | null> => {
    if (!orgId || !user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return null;
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non supporté",
        description: "Seuls les fichiers PDF et PPTX sont acceptés",
        variant: "destructive",
      });
      return null;
    }

    // 🔍 FORCE SESSION REFRESH (Fix for "Invalid JWT")
    const { data: { session }, error: sessionError } = await supabase.auth
      .getSession();
    if (sessionError || !session) {
      console.error("Session refresh failed:", sessionError);
      toast({
        title: "Session expirée",
        description: "Veuillez vous reconnecter",
        variant: "destructive",
      });
      return null;
    }

    setIsUploading(true);
    try {
      // Upload to storage
      const filePath = `${orgId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-vault")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is private)
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from("knowledge-vault")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      if (signedUrlError) throw signedUrlError;

      const fileUrl = signedUrlData.signedUrl;

      // Create database entry
      const { data: knowledgeDoc, error: dbError } = await supabase
        .from("knowledge_base")
        .insert({
          org_id: orgId,
          file_name: file.name,
          file_url: fileUrl,
          doc_type: docType,
          processing_status: "pending",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Trigger background processing
      const { error: processError } = await supabase.functions.invoke(
        "process-document",
        {
          body: {
            knowledgeId: knowledgeDoc.id,
            fileUrl: fileUrl,
            fileName: file.name,
            docType,
            orgId,
          },
        },
      );

      if (processError) {
        console.error("Processing trigger error:", processError);
        // Don't fail - document is uploaded, processing might work later
      }

      toast({ title: "Document uploadé", description: "Analyse en cours..." });

      // Add to local state
      setDocuments((prev) => [knowledgeDoc as KnowledgeDocument, ...prev]);

      return knowledgeDoc as KnowledgeDocument;
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erreur d'upload",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Delete document
  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from("knowledge_base")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      toast({ title: "Document supprimé" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Erreur de suppression",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    }
  };

  // Refresh document status
  const refreshDocument = async (documentId: string) => {
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("*")
      .eq("id", documentId)
      .single();

    if (!error && data) {
      setDocuments((prev) =>
        prev.map((d) => d.id === documentId ? data as KnowledgeDocument : d)
      );
    }

    return data as KnowledgeDocument | null;
  };

  return {
    documents,
    isLoading,
    isUploading,
    orgId,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    refreshDocument,
  };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CompanyDocument {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  extracted_content: string | null;
  extraction_status: string;
  created_at: string;
  updated_at: string;
}

export function useCompanyDocuments() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch documents for current project
  const fetchDocuments = useCallback(async () => {
    if (!currentProject || !user) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Type assertion since we know the structure matches
      setDocuments((data as unknown as CompanyDocument[]) || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, user, toast]);

  // Upload a file
  const uploadDocument = useCallback(
    async (file: File): Promise<CompanyDocument | null> => {
      if (!currentProject || !user) {
        toast({
          title: "Erreur",
          description: "Aucun projet sélectionné",
          variant: "destructive",
        });
        return null;
      }

      setIsUploading(true);
      try {
        // Validate file type
        const allowedTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "text/markdown",
        ];

        if (!allowedTypes.includes(file.type) && !file.name.endsWith(".md")) {
          throw new Error(
            `Type de fichier non supporté: ${
              file.type || file.name.split(".").pop()
            }. Formats acceptés: PDF, PPTX, DOCX, TXT, MD`,
          );
        }

        // Create unique file path: user_id/project_id/timestamp_filename
        const timestamp = Date.now();
        const filePath =
          `${user.id}/${currentProject.id}/${timestamp}_${file.name}`;

        console.log("[useCompanyDocuments] Uploading to path:", filePath);

        // Upload to storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("project-files")
          .upload(filePath, file);

        if (uploadError) {
          console.error(
            "[useCompanyDocuments] Storage upload error:",
            uploadError,
          );
          if (uploadError.message.includes("mime type")) {
            throw new Error(
              `Type de fichier non autorisé. Formats acceptés: PDF, PPTX, DOCX, TXT`,
            );
          }
          if (
            uploadError.message.includes("row-level security") ||
            uploadError.message.includes("policy")
          ) {
            throw new Error(
              `Erreur de permissions Storage. Reconnectez-vous ou contactez le support.`,
            );
          }
          throw new Error(`Erreur Storage: ${uploadError.message}`);
        }

        console.log("[useCompanyDocuments] Upload success:", uploadData);

        // Get signed URL for the file
        const { data: urlData, error: urlError } = await supabase.storage
          .from("project-files")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year validity

        if (urlError || !urlData?.signedUrl) {
          console.error("[useCompanyDocuments] Signed URL error:", urlError);
          throw new Error("Impossible de générer l'URL du fichier");
        }

        // Create database entry
        const fileExtension = file.name.split(".").pop()?.toLowerCase() ||
          "unknown";

        const { data: docData, error: dbError } = await supabase
          .from("company_documents")
          .insert({
            project_id: currentProject.id,
            user_id: user.id,
            file_name: file.name,
            file_url: urlData.signedUrl,
            file_type: fileExtension,
            file_size: file.size,
            extraction_status: "pending",
          })
          .select()
          .single();

        if (dbError) {
          console.error("[useCompanyDocuments] DB insert error:", dbError);
          if (
            dbError.message.includes("row-level security") ||
            dbError.code === "42501"
          ) {
            throw new Error(
              `Erreur de permissions Base de données. Vérifiez votre connexion.`,
            );
          }
          throw new Error(`Erreur Base de données: ${dbError.message}`);
        }

        const newDoc = docData as unknown as CompanyDocument;
        setDocuments((prev) => [newDoc, ...prev]);

        // Trigger text extraction in background
        supabase.functions.invoke("extract-document-text", {
          body: {
            documentId: newDoc.id,
            fileUrl: urlData.signedUrl,
            fileName: file.name,
            projectId: currentProject.id, // FIX: Pass Project ID to prevent context loss
          },
        }).then(({ data, error }) => {
          if (error) {
            console.error("[useCompanyDocuments] Extraction error:", error);
            // Update status to failed
            setDocuments((prev) =>
              prev.map((doc) =>
                doc.id === newDoc.id
                  ? { ...doc, extraction_status: "failed" }
                  : doc
              )
            );
            toast({
              title: "Extraction partielle",
              description:
                `Le fichier est uploadé mais l'extraction de texte a échoué: ${
                  error.message || "Erreur inconnue"
                }`,
              variant: "destructive",
            });
          } else if (data?.success) {
            // Update local state with extraction status
            setDocuments((prev) =>
              prev.map((doc) =>
                doc.id === newDoc.id
                  ? {
                    ...doc,
                    extraction_status: "completed",
                    extracted_content: data.extractedText ||
                      `[${data.charCount} caractères extraits]`,
                  }
                  : doc
              )
            );
          }
        });

        return newDoc;
      } catch (error) {
        console.error("[useCompanyDocuments] Upload failed:", error);
        toast({
          title: "Erreur d'upload",
          description: error instanceof Error
            ? error.message
            : "Impossible d'uploader le fichier",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [currentProject, user, toast],
  );

  // Delete a document
  const deleteDocument = useCallback(
    async (documentId: string, filePath?: string) => {
      try {
        // Delete from database
        const { error: dbError } = await supabase
          .from("company_documents")
          .delete()
          .eq("id", documentId);

        if (dbError) throw dbError;

        // Remove from local state
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));

        toast({
          title: "Document supprimé",
          description: "Le fichier a été supprimé",
        });
      } catch (error) {
        console.error("Error deleting document:", error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le document",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // Get all extracted content as a single string
  const getAllExtractedContent = useCallback(() => {
    return documents
      .filter((doc) =>
        doc.extracted_content && doc.extraction_status === "completed"
      )
      .map((doc) => `--- ${doc.file_name} ---\n${doc.extracted_content}`)
      .join("\n\n");
  }, [documents]);

  // Load documents when project changes
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    isUploading,
    uploadDocument,
    deleteDocument,
    fetchDocuments,
    getAllExtractedContent,
  };
}

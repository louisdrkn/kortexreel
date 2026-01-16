import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AgencyDNA, TargetDefinition } from "./types.ts";

export interface GlobalContext {
  projectId: string;
  agencyName: string;
  agencyPitch: string;
  agencyMethodology: string;
  websiteContent: string;
  documentsContent: string;
  targetDescription: string;
  fullText: string;
}

export class ContextAggregator {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Assembles the "Total Knowledge" context for a given project.
   * This includes:
   * 1. Agency DNA (Pitch, Methodology) from 'project_data'
   * 2. Scraped Website Content from 'project_data' (or potentially 'web_knowledge' in future)
   * 3. Indexed Documents from 'company_documents'
   */
  async assembleGlobalContext(projectId: string): Promise<GlobalContext> {
    console.log(
      `[ContextAggregator] Assembling global context for ${projectId}...`,
    );

    // 1. Fetch Project Data (DNA & Target)
    const { data: projectData, error: projectError } = await this.supabase
      .from("project_data")
      .select("data_type, data")
      .eq("project_id", projectId);

    if (projectError) {
      throw new Error(`Failed to fetch project data: ${projectError.message}`);
    }

    const agencyDNA =
      (projectData?.find((d) => d.data_type === "agency_dna")?.data as
        | AgencyDNA
        | undefined) || {};
    const targetDef =
      (projectData?.find((d) => d.data_type === "target_definition")?.data as
        | TargetDefinition
        | undefined) || {};

    // 2. Fetch Documents
    const { data: documentsData, error: docsError } = await this.supabase
      .from("company_documents")
      .select("file_name, extracted_content")
      .eq("project_id", projectId)
      .eq("extraction_status", "completed");

    if (docsError) {
      console.warn("[ContextAggregator] Docs fetch warning:", docsError);
    }

    // 3. Process & Format
    const pitch = agencyDNA.pitch || "";
    const methodology = agencyDNA.methodology || "";
    // Note: older scrapes might be inside agencyDNA.extractedContent, new ones might change location.
    // We keep compat with current structure for now.
    const websiteContent = agencyDNA.extractedContent?.websiteContent || "";

    const docsText =
      documentsData?.map((d) =>
        `--- DOCUMENT: ${d.file_name} ---\n${
          d.extracted_content?.substring(0, 150000)
        }` // High limit (150k) but safe for Edge Function Timeout
      ).join("\n\n") || "";

    const fullText = `
    === KNOWLEDGE BASE (PRIMARY SOURCE OF TRUTH - CRITICAL) ===
    ${docsText}

    === AGENCY PITCH (SECONDARY) ===
    ${pitch}

    === AGENCY METHODOLOGY (SECONDARY) ===
    ${methodology}

    === WEBSITE CONTENT (SUPPORTING CONTEXT) ===
    ${websiteContent.substring(0, 15000)}
    `;

    return {
      projectId,
      agencyName: agencyDNA.companyName || "Unknown Agency",
      agencyPitch: pitch,
      agencyMethodology: methodology,
      websiteContent,
      documentsContent: docsText,
      targetDescription: targetDef.targetDescription || "",
      fullText,
    };
  }
}

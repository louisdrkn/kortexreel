import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function buildProjectContext(
  supabase: SupabaseClient,
  projectId: string,
): Promise<string> {
  console.log(
    `[CONTEXT] Building complete project context for ${projectId}...`,
  );

  // 1. IDENTITY & STRATEGY (Project Data)
  const { data: projectData } = await supabase
    .from("project_data")
    .select("data_type, data")
    .eq("project_id", projectId);

  let identity = "";
  let strategy = "";
  let trackRecord = "";

  if (projectData) {
    const dna = projectData.find((d) => d.data_type === "agency_dna")?.data ||
      {};
    const targetCriteria = projectData.find((d) =>
      d.data_type === "target_criteria"
    )?.data || {};
    const targetDef = projectData.find((d) =>
      d.data_type === "target_definition"
    )?.data || {};

    identity = `
## 1. IDENTITÉ DE L'ENTREPRISE (QUI NOUS SOMMES)
Mission: ${dna.mission || "Non définie"}
Offre: ${dna.offerName || dna.pitch || "Non définie"}
Valeurs: ${dna.values?.join(", ") || "Non définies"}
Description: ${dna.description || ""}
Méthodologie: ${dna.methodology || ""}
Différenciateurs: ${dna.differentiators?.join(", ") || ""}
`;

    strategy = `
## 2. STRATÉGIE DE CIBLAGE (QUI NOUS CHERCHONS)
Cible Idéale: ${
      targetCriteria.targetDescription || targetDef.targetDescription ||
      "Non définie"
    }
Secteurs: ${(targetCriteria.industries || dna.targetSectors || []).join(", ")}
Taille: ${targetCriteria.companySize || dna.targetSize || "Non définie"}
Fonctions: ${(targetCriteria.functions || dna.decisionMakers || []).join(", ")}
Géographie: ${targetCriteria.geography || dna.geography || "Non définie"}

### DEAL BREAKERS (À ÉVITER ABSOLUMENT)
${(targetCriteria.dealBreakers || []).join("\n")}
${(targetCriteria.excludedSectors || []).join("\n")}
${(dna.excludedProfiles || []).join("\n")}
`;

    // Extract Track Record from DNA if it exists there
    if (dna.trackRecord) {
      trackRecord = `
## 4. TRACK RECORD (HISTORIQUE)
Clients Passés: ${
        (dna.trackRecord.pastClients || []).map((c: any) => c.name).join(", ")
      }
Clients Rêvés: ${(dna.trackRecord.dreamClients || []).join(", ")}
`;
    }
  }

  // 2. DOCUMENT MEMORY (The "Brain")
  // FETCH ALL COMPLETED DOCUMENTS - NO LIMITS
  const { data: documents } = await supabase
    .from("company_documents")
    .select("file_name, extracted_content")
    .eq("project_id", projectId)
    .eq("extraction_status", "completed");

  let memory = "## 3. MÉMOIRE DOCUMENTAIRE (TIERS DE CONFIANCE)\n";
  if (documents && documents.length > 0) {
    console.log(`[CONTEXT] Ingesting ${documents.length} documents...`);
    for (const doc of documents) {
      memory +=
        `\n=== DOCUMENT: ${doc.file_name} ===\n${doc.extracted_content}\n==============================\n`;
    }
  } else {
    memory += "Aucun document disponible.\n";
  }

  // 3. COMPILE FINAL CONTEXT
  const fullContext = `
========================================
PROJECT OMNISCIENCE CONTEXT INJECTION
========================================

${identity}

${strategy}

${memory}

${trackRecord}

========================================
FIN DU CONTEXTE PROJET
========================================
`;

  console.log(
    `[CONTEXT] Total context size: ${fullContext.length} characters.`,
  );
  return fullContext;
}

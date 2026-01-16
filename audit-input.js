import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ocblkbykswegxpdvonof.supabase.co";
const SERVICE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxrYnlrc3dlZ3hwZHZvbm9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA0ODAxNywiZXhwIjoyMDgzNjI0MDE3fQ.MI6FjsTsHozSF8P-u2N4Qmco02fJgh041LJTuBR6Lq0";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkInput() {
    // 1. Get Project
    const { data: projects } = await supabase.from("projects").select(
        "id, name",
    ).limit(1);
    if (!projects || projects.length === 0) {
        console.log("No Project");
        return;
    }
    const pid = projects[0].id;

    // 2. Get Data
    const { data: projectData } = await supabase.from("project_data").select(
        "data_type, data",
    ).eq("project_id", pid);

    const agencyDNA =
        projectData?.find((d) => d.data_type === "agency_dna")?.data || {};
    const targetDef =
        projectData?.find((d) => d.data_type === "target_definition")?.data ||
        {};

    const pitch = agencyDNA.pitch || "";
    const target = targetDef.targetDescription || "";

    console.log("--- INPUT CHECK ---");
    console.log(`PITCH_PREVIEW: "${pitch.substring(0, 20)}..."`);
    console.log(`TARGET_PREVIEW: "${target.substring(0, 20)}..."`);
    console.log("-------------------");
}

checkInput();

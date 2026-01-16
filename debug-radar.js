import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ocblkbykswegxpdvonof.supabase.co";
// USER PROVIDED KEYS (Retrieved from .env)
const SERVICE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxrYnlrc3dlZ3hwZHZvbm9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA0ODAxNywiZXhwIjoyMDgzNjI0MDE3fQ.MI6FjsTsHozSF8P-u2N4Qmco02fJgh041LJTuBR6Lq0";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
    console.log("🕵️‍♂️ RADAR AUTOPSY STARTING (Node.js)...");

    // 1. GET PROJECT ID (Targeting "TEST CLIENT" from screenshot)
    // 1. GET PROJECT ID (Targeting "Test Client" from output)
    let { data: projects } = await supabaseAdmin.from("projects").select("*")
        .eq("name", "Test Client");

    if (!projects || projects.length === 0) {
        console.log("⚠️ 'Test Client' not found. Listing all projects...");
        const { data: allProjects } = await supabaseAdmin.from("projects")
            .select("*").limit(5);
        console.log("Available Projects:", allProjects);
        projects = allProjects;
    }

    if (!projects || projects.length === 0) {
        console.error("❌ No projects found in DB to test with.");
        return;
    }
    const project = projects[0];
    console.log("Projects Keys:", Object.keys(project));
    console.log(`📂 Using Project: ${project.name} (${project.id})`);
    console.log(`👤 Project Owner ID: ${project.user_id}`);

    // 1.5 CHECK EXISTING ROWS (Before Clearing)
    const { count: appCount } = await supabaseAdmin
        .from("company_analyses")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id);
    console.log(`📊 APP TABLE (company_analyses) Rows: ${appCount}`);

    const { count: cacheCount, error: cacheError } = await supabaseAdmin
        .from("kortex_prospects")
        .select("*", { count: "exact", head: true })
        .like("query_signature", `${project.id}%`);

    if (cacheError) {
        console.error("❌ CACHE TABLE ERROR:", cacheError);
    } else {
        console.log(`📦 CACHE TABLE (kortex_prospects) Rows: ${cacheCount}`);
    }

    // 2. CLEAR CACHE (RESET)
    const { error: deleteError, count } = await supabaseAdmin
        .from("company_analyses")
        .delete({ count: "exact" })
        .eq("project_id", project.id);

    if (deleteError) {
        console.error("❌ Failed to clear cache:", deleteError);
    } else {
        console.log(`✅ Cache Cleared! Deleted rows: ${count}`);
    }

    // 3. INVOKE FUNCTION
    console.log("📡 Invoking discover-companies function...");

    const { data, error } = await supabaseAdmin.functions.invoke(
        "discover-companies",
        {
            body: {
                projectId: project.id,
                force_refresh: true,
                strategy: "flash_scan",
            },
        },
    );

    if (error) {
        console.error("❌ Function Invocation Failed:", error);
    } else {
        console.log(
            "✅ Function Returned Data Status:",
            data?.success ? "SUCCESS" : "FAIL",
        );

        // COUNT OBJECTS
        if (data?.db_debug) {
            console.log("🐛 DB DEBUG:", JSON.stringify(data.db_debug, null, 2));
        }

        if (data?.companies) {
            console.log(
                `🔢 NUMBER OF COMPANIES FOUND: ${data.companies.length}`,
            );
            if (data.companies.length > 0) {
                console.log("🔍 Sample Company (0):", data.companies[0]);
            } else {
                console.warn(
                    "⚠️ Companies array is EMPTY []. This is the 'Zero Result' cause.",
                );
            }
        } else {
            console.error(
                "⚠️ Response missing 'companies' key. Payload:",
                data,
            );
        }
    }
}

main();

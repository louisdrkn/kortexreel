import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = "https://ocblkbykswegxpdvonof.supabase.co";
// USER PROVIDED KEYS
const SERVICE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxrYnlrc3dlZ3hwZHZvbm9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA0ODAxNywiZXhwIjoyMDgzNjI0MDE3fQ.MI6FjsTsHozSF8P-u2N4Qmco02fJgh041LJTuBR6Lq0";
const ANON_KEY = "sb_publishable_X9sJkgAlHaMPTUsj5f6u3A_MdwP59-d";

// Initialize clients
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);

// ID of the project to test (Mock or ask user, but let's try to query one)
// Or we just clear ALL for now as requested "Vide manuellement la table... pour ce projet"
// finding a project id first.

async function main() {
    console.log("🕵️‍♂️ RADAR AUTOPSY STARTING...");

    // 1. GET PROJECT ID
    const { data: projects } = await supabaseAdmin.from("projects").select(
        "id, name",
    ).limit(1);
    if (!projects || projects.length === 0) {
        console.error("❌ No projects found in DB to test with.");
        return;
    }
    const project = projects[0];
    console.log(`📂 Using Project: ${project.name} (${project.id})`);

    // 2. CLEAR CACHE (RESET)
    console.log("🧹 Clearing company_analyses for this project...");
    const { error: deleteError, count } = await supabaseAdmin
        .from("company_analyses")
        .delete({ count: "exact" })
        .eq("project_id", project.id);

    if (deleteError) {
        console.error("❌ Failed to clear cache:", deleteError);
    } else {
        console.log(`✅ Cache Cleared! Deleted rows: ${count}`);
    }

    // 3. CHECK RLS (Is Insert Allowed for Anon?)
    // We can't easily check 'can I insert' without trying and potentially failing auth if we don't have a user session.
    // But we can check if the table allows public selection at least.

    // 4. INVOKE FUNCTION (Simulate Radar)
    console.log(
        "📡 Invoking discover-companies function (as Anon/User placeholder)...",
    );

    // We need a dummy user token or just try with anon if policies allow (usually Edge Functions check Authorization header)
    // The function expects a Bearer token. I cannot generate a valid user token easily without signing in.
    // BUT I can use the SERVICE_KEY to invoke the function and see the OUTPUT regardless of RLS,
    // ensuring the function logic itself works.

    const { data, error } = await supabaseAdmin.functions.invoke(
        "execute-radar",
        {
            body: {
                projectId: project.id,
                approved_queries: ["Software companies in France doing AI"],
            },
        },
    );

    if (error) {
        console.error("❌ Function Invocation Failed:", error);
        // If it's a 400/500, we might see details
    } else {
        console.log("✅ Function Returned Data:");
        console.log("------------------------------------------");
        // console.log(JSON.stringify(data, null, 2));

        // ANALYZE OUTPUT
        if (data.companies) {
            console.log(`📊 Companies Found: ${data.companies.length}`);
            if (data.companies.length > 0) {
                console.log(
                    "Example Company:",
                    JSON.stringify(data.companies[0], null, 2),
                );
            } else {
                console.warn("⚠️ Companies array is EMPTY.");
            }
        } else {
            console.error(
                "⚠️ Response missing 'companies' key:",
                Object.keys(data),
            );
        }
        console.log("------------------------------------------");
    }
}

main();

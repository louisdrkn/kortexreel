import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ocblkbykswegxpdvonof.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmxrYnlrc3dlZ3hwZHZvbm9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA0ODAxNywiZXhwIjoyMDgzNjI0MDE3fQ.MI6FjsTsHozSF8P-u2N4Qmco02fJgh041LJTuBR6Lq0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
    console.log("🔍 Finding a valid project...");

    // Get the most recent project
    const { data: projects, error } = await supabase
        .from("projects")
        .select("id, user_id, name")
        .order("created_at", { ascending: false })
        .limit(1);

    if (error || !projects || projects.length === 0) {
        console.error("❌ No project found to test with.", error);
        return;
    }

    const project = projects[0];
    console.log(`✅ Using project: ${project.name} (${project.id})`);

    console.log("🚀 Triggering Radar (Search Companies)...");

    // Call the function directly via generic invoke or fetch if needed
    const { data, error: funcError } = await supabase.functions.invoke(
        "search-companies",
        {
            body: {
                projectId: project.id,
                force_refresh: true, // Force the AI part to run
                strategy: "expansion",
            },
        },
    );

    if (funcError) {
        console.error("❌ Radar Function Failed:");
        if (funcError.context && typeof funcError.context.json === "function") {
            try {
                const errBody = await funcError.context.json();
                console.error(
                    "Server Response:",
                    JSON.stringify(errBody, null, 2),
                );
            } catch (e) {
                console.error("Could not parse error body", e);
            }
        } else {
            console.error(funcError);
        }
    } else {
        // Check if the response itself indicates an error (since invoke might not throw on 400/500 if handled by supabase-js)
        if (data && data.success === false) {
            console.error(
                "❌ Radar Function Returned Logic Error:",
                data.error,
            );
        } else {
            console.log("✅ Radar Function Success!");
            console.log("Response:", JSON.stringify(data, null, 2));
        }
    }
}

runTest();

import pg from "pg";
import dotenv from "dotenv";

const { Client } = pg;

// Load environment variables
dotenv.config();
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
}

const main = async () => {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();

        console.log("=== DIAGNOSTIC START ===");

        // 1. Get all projects
        const resProjects = await client.query(
            "SELECT id, created_at FROM projects ORDER BY created_at DESC LIMIT 10",
        );
        const projects = resProjects.rows;
        console.log(`Found ${projects.length} recent projects.`);

        for (const p of projects) {
            console.log(
                `\n---------------------------------------------------`,
            );
            console.log(`Project ID: ${p.id} (Created: ${p.created_at})`);

            // 2. Check Agency DNA
            const resDNA = await client.query(
                "SELECT data FROM project_data WHERE project_id = $1 AND data_type = 'agency_dna'",
                [p.id],
            );
            if (resDNA.rows.length > 0) {
                const dna = resDNA.rows[0].data;
                const companyName = dna.companyName || "N/A";
                const website = dna.website || "N/A";
                console.log(
                    `  [DNA] Name: ${companyName}, Website: ${website}`,
                );

                // Check for Axole leakage in DNA
                const jsonStr = JSON.stringify(dna).toLowerCase();
                if (
                    jsonStr.includes("axole") &&
                    website.toLowerCase().indexOf("axole") === -1
                ) {
                    console.warn(
                        `  ⚠️ ALERT: 'Axole' found in DNA but website is not Axole!`,
                    );
                }
            } else {
                console.log(`  [DNA] No Agency DNA found.`);
            }

            // 3. Check Website Pages
            const resPages = await client.query(
                "SELECT url, substring(content from 1 for 100) as snippet FROM website_pages WHERE project_id = $1 LIMIT 5",
                [p.id],
            );
            console.log(`  [PAGES] Found ${resPages.rows.length} pages.`);
            resPages.rows.forEach((r) => {
                console.log(`    - ${r.url}`);
                if (r.snippet && r.snippet.toLowerCase().includes("axole")) {
                    console.warn(
                        `    ⚠️ ALERT: 'Axole' found in page content!`,
                    );
                }
            });

            // 4. Check Identity
            const resIdentity = await client.query(
                "SELECT unique_value_proposition FROM strategic_identities WHERE project_id = $1",
                [p.id],
            );
            if (resIdentity.rows.length > 0) {
                const uvp = resIdentity.rows[0].unique_value_proposition;
                console.log(`  [IDENTITY] UVP: ${uvp.substring(0, 100)}...`);
                if (uvp.toLowerCase().includes("axole")) {
                    console.warn(
                        `  ⚠️ ALERT: 'Axole' found in Strategic Identity!`,
                    );
                }
            } else {
                console.log(`  [IDENTITY] No identity generated.`);
            }
        }

        console.log("\n=== DIAGNOSTIC END ===");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.end();
    }
};

main();

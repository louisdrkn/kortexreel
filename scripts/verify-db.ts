import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

const env = config();
const dbUrl = Deno.env.get("DATABASE_URL") || env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ DATABASE_URL is required");
    Deno.exit(1);
}

const client = new Client(dbUrl);
await client.connect();

try {
    const result = await client.queryArray(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );

    console.log("📊 TABLES FOUND IN DATABASE:");
    if (result.rows.length === 0) {
        console.log("⚠️ No tables found.");
    } else {
        result.rows.forEach(row => console.log(`- ${row[0]}`));
        console.log(`\n✅ Total: ${result.rows.length} tables verified.`);
    }

} catch (err) {
    console.error(err);
} finally {
    await client.end();
}

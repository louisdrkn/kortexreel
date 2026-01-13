import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

// Load environment variables
const env = config();
const dbUrl = Deno.env.get("DATABASE_URL") || env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ DATABASE_URL is required");
    Deno.exit(1);
}

try {
    console.log("🔌 Connecting to database...");
    const client = new Client(dbUrl);
    await client.connect();
    console.log("✅ Connected.");

    console.log("📖 Reading init.sql...");
    const sqlContent = await Deno.readTextFile("./supabase/init.sql");

    console.log("🚀 Executing SQL migration...");
    // Split statements by semicolon to execute them one by one if needed, 
    // currently postgres driver handle multiple statements in query object, 
    // but it's safer to run it as a transaction or single block.

    await client.queryArray(sqlContent);

    console.log("✅ Database initialized successfully");

    await client.end();
} catch (err) {
    console.error("❌ Error initializing database:", err);
    Deno.exit(1);
}

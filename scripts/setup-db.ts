import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";

const { Client } = pg;

// Load environment variables
dotenv.config();
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
}

const main = async () => {
    try {
        console.log("🔌 Connecting to database...");
        const client = new Client({ connectionString: dbUrl });
        await client.connect();
        console.log("✅ Connected.");

        console.log("📖 Reading init.sql...");
        const sqlContent = fs.readFileSync("./supabase/init.sql", "utf-8");

        console.log("🚀 Executing SQL migration...");
        // node-postgres supports multiple statements in one query string
        await client.query(sqlContent);

        console.log("✅ Database initialized successfully");

        await client.end();
    } catch (err) {
        console.error("❌ Error initializing database:", err);
        process.exit(1);
    }
};

main();

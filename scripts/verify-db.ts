import pg from "pg";
import dotenv from "dotenv";

const { Client } = pg;

dotenv.config();
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
}

const main = async () => {
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
        const result = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
        );

        console.log("📊 TABLES FOUND IN DATABASE:");
        if (result.rows.length === 0) {
            console.log("⚠️ No tables found.");
        } else {
            result.rows.forEach((row) => console.log(`- ${row.table_name}`));
            console.log(`\n✅ Total: ${result.rows.length} tables verified.`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
};

main();

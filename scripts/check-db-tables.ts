// scripts/check-db-tables.ts
// Run with: npx dotenv -e .env tsx scripts/check-db-tables.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("⏳ Connecting to Supabase...");
    await prisma.$connect();
    console.log("✅ Connected!\n");

    // Check all expected tables exist
    const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

    if (tables.length === 0) {
        console.log("❌ No tables found — migrations have NOT been run yet.");
        console.log("   Run: npx dotenv -e .env -- npx prisma migrate deploy");
    } else {
        console.log(`✅ Found ${tables.length} tables:`);
        tables.forEach((t) => console.log(`   - ${t.table_name}`));
    }

    // Check row counts for key tables
    try {
        const userCount = await prisma.user.count();
        const projectCount = await prisma.project.count();
        const taskCount = await prisma.task.count();
        console.log("\n📊 Row counts:");
        console.log(`   Users:    ${userCount}`);
        console.log(`   Projects: ${projectCount}`);
        console.log(`   Tasks:    ${taskCount}`);

        if (userCount === 0) {
            console.log("\n⚠️  No users found — seed data has NOT been run.");
            console.log("   Run: npx dotenv -e .env -- npx prisma db seed");
        }
    } catch (e: any) {
        console.log("\n❌ Could not query tables:", e.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

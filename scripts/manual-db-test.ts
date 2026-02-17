
// import { PrismaClient } from '@prisma/client';

// // ==========================================
// // 🛠️ CONFIGURATION SECTION - EDIT THIS 🛠️
// // ==========================================

// const PROJECT_REF = 'ouvaexdqhfrcpeqemjqh'; // Your Project ID
// const PASSWORD = 'Chikkala2857%40';        // URL Encoded Password (replace @ with %40)
// const REGION = 'ap-south-1';                 // Try: us-east-1, ap-south-1, ap-southeast-1, eu-central-1

// // ==========================================
// // DO NOT EDIT BELOW THIS LINE
// // ==========================================

// const poolerUrl = `postgres://postgres.${PROJECT_REF}:${PASSWORD}@aws-0-${REGION}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
// const directUrl = `postgresql://postgres:${PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

// console.log('---------------------------------------------------');
// console.log(`🔍 Testing Region: ${REGION}`);
// console.log(`🔗 Pooler URL: ${poolerUrl}`);
// console.log('---------------------------------------------------');

// const prisma = new PrismaClient({
//     datasources: {
//         db: {
//             url: poolerUrl
//         }
//     }
// });

// async function main() {
//     console.log('⏳ Attempting to connect...');
//     try {
//         await prisma.$connect();
//         console.log('✅ CONNECTION SUCCESSFUL! THIS IS THE CORRECT REGION.');

//         const count = await prisma.user.count();
//         console.log(`📊 Validated by querying Users table. Count: ${count}`);

//     } catch (error: any) {
//         console.log('\n❌ CONNECTION FAILED');

//         if (error.message.includes('Tenant or user not found')) {
//             console.log('👉 CAUSE: Incorrect Region (or Project ID). Try changing the REGION variable.');
//         } else if (error.message.includes('password authentication failed')) {
//             console.log('👉 CAUSE: Incorrect Password.');
//         } else if (error.code === 'ETIMEDOUT' || error.message.includes('ETIMEDOUT')) {
//             console.log('👉 CAUSE: Network Timeout. Firewall or ISP blocking connection.');
//         } else {
//             console.log('👉 ERROR DETAILS:');
//             console.log(error.message);
//         }
//     } finally {
//         await prisma.$disconnect();
//     }
// }

// main();





import { PrismaClient } from '@prisma/client';

// ==========================================
// 🛠️ CONFIGURATION SECTION - EDIT THIS 🛠️
// ==========================================

const PROJECT_REF = 'ouvaexdqhfrcpeqemjqh';
const PASSWORD = 'Chikkala2857%40';
const REGION = 'ap-south-1';

// ==========================================
// DO NOT EDIT BELOW THIS LINE
// ==========================================

const DATABASE_URL = 'postgresql://postgres.ouvaexdqhfrcpeqemjqh:Chikkala2857%40@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
// `postgres://postgres.${PROJECT_REF}:${PASSWORD}` +
// `@aws-0-${REGION}.pooler.supabase.com:6543/postgres` +
// `?pgbouncer=true&connection_limit=1&sslmode=require`;

console.log('---------------------------------------------------');
console.log(`🔍 Testing Supabase Region: ${REGION}`);
console.log('---------------------------------------------------');

const prisma = new PrismaClient({
    datasources: {
        db: { url: DATABASE_URL },
    },
});

async function main() {
    console.log('⏳ Connecting to Supabase...');

    try {
        await prisma.$connect();
        console.log('✅ CONNECTION SUCCESSFUL');

        // 🔎 Raw query avoids Prisma model issues
        const result = await prisma.$queryRawUnsafe(`SELECT 1 as ok;`);
        console.log('📊 Query test result:', result);

    } catch (error: any) {
        console.log('\n❌ CONNECTION FAILED');

        if (error.message?.includes('Tenant or user not found')) {
            console.log('👉 Wrong REGION or PROJECT_REF');
        } else if (error.message?.includes('password authentication failed')) {
            console.log('👉 Wrong PASSWORD (must be URL encoded)');
        } else if (
            error.code === 'ETIMEDOUT' ||
            error.message?.includes('ETIMEDOUT')
        ) {
            console.log('👉 Network blocked by firewall / ISP');
        } else {
            console.log('👉 ERROR DETAILS:\n', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();


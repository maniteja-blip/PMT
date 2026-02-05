
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Attempting to connect to database...');
    try {
        await prisma.$connect();
        console.log('✅ Connection successful!');

        // Try a simple query
        const userCount = await prisma.user.count();
        console.log(`✅ Database queried successfully. User count: ${userCount}`);

    } catch (error) {
        console.error('❌ Connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

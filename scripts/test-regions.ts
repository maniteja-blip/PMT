
import { PrismaClient } from '@prisma/client';

const projectRef = 'ouvaexdqhfrcpeqemjqh';
const password = 'Chikkala2857%40'; // Encoded
const regions = [
    'us-east-1',
    'ap-south-1',
    'ap-southeast-1',
    'eu-central-1',
    'us-west-1',
    'sa-east-1',
    'eu-west-1',
    'eu-west-2',
    'eu-central-1',
    'ca-central-1',
    'ap-northeast-1',
    'ap-northeast-2'
];

async function testRegion(region: string) {
    const url = `postgres://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    console.log(`Testing region: ${region}...`);

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: url
            }
        }
    });

    try {
        // Set a timeout or just try connect
        await prisma.$connect();
        console.log(`✅ SUCCESS! The project is in region: ${region}`);
        console.log(`Connection String: ${url}`);
        await prisma.$disconnect();
        return url;
    } catch (e: any) {
        // Look for specific errors or just generic fail
        // 'Tenant or user not found' means wrong region
        const msg = e.message || '';
        if (msg.includes('Tenant or user not found')) {
            console.log(`❌ Failed: Wrong region (Tenant not found)`);
        } else if (msg.includes('ENOTFOUND')) {
            console.log(`❌ Failed: Network/DNS error`);
        } else {
            console.log(`❌ Failed: ${msg.split('\n')[0]}`); // Print first line of error
        }
        await prisma.$disconnect();
        return null;
    }
}

async function main() {
    console.log('Starting Region Discovery for Project:', projectRef);

    for (const region of regions) {
        const successUrl = await testRegion(region);
        if (successUrl) {
            console.log('\n!!! FOUND MATCH !!!');
            console.log('Update your .env with:');
            console.log(`DATABASE_URL="${successUrl}"`);
            process.exit(0);
        }
    }

    console.log('\n❌ Could not find a matching region. Check Project ID or Network.');
    process.exit(1);
}

main();

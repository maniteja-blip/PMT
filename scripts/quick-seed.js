const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    const email = "admin@pmt.local";
    console.log(`Seeding admin user: ${email}`);

    // Upsert admin user
    const passwordHash = await bcrypt.hash("pmt", 10);

    const admin = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            name: "Admin User",
            role: "ADMIN",
            passwordHash,
            weeklyCapacityHours: 40,
        },
    });

    console.log("Admin user created:", admin.id);

    // Create a dummy project so dashboard isn't empty
    await prisma.project.create({
        data: {
            name: "Internal Operations",
            status: "ACTIVE",
            health: "ON_TRACK",
            ownerId: admin.id,
        },
    });
    console.log("Sample project created.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

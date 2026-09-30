import { Prisma, Role, UserType } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";
import { db as prisma } from "../src/lib/db";

async function main() {
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash("password123", salt);

    // Upsert admin so re-running the seed never fails on duplicate username
    const systemAdmin = await prisma.user.upsert({
        where: { username: "admin" },
        update: {},
        create: {
            username: "admin",
            password: defaultPasswordHash,
            role: Role.Admin,
            type: UserType.sender,
            phone: "+201000000001",
        },
    });

    // Create an open session if one doesn't already exist
    const existingOpen = await prisma.session.findFirst({ where: { status: "OPEN" } });
    if (!existingOpen) {
        await prisma.session.create({
            data: {
                status: "OPEN",
                openedBy: systemAdmin.id,
                notes: "Default dev session (seeded)",
            },
        });
        console.log("✓ Open session created.");
    } else {
        console.log("✓ Open session already exists, skipping.");
    }

    console.log("✓ Seed complete. Admin user:", systemAdmin.username);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
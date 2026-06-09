import "@prisma/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log("Users:", users);
}

main()
    .catch((e) => {
        console.error("Error:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
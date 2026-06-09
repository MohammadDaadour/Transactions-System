import { Prisma, Role, UserType, Currency, TransactionType } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { db as prisma } from "../src/lib/db";

async function main() {
    console.log("⏳ Starting system seed configuration...");

    // 1. Wipe out any existing data to avoid conflict anomalies during tests
    await prisma.auditLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.userBalance.deleteMany();
    await prisma.user.deleteMany();

    console.log("🧹 Database cleared cleanly.");

    // 2. Generate secure hashed credentials
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash("password123", salt);

    // 3. Create Organizational System Actors (Admin & Mod)
    const systemAdmin = await prisma.user.create({
        data: {
            username: "admin",
            password: defaultPasswordHash,
            role: Role.Admin,
            type: UserType.sender,
            phone: "+201000000001",
        },
    });

    const deskMod = await prisma.user.create({
        data: {
            username: "operator_ahmed",
            password: defaultPasswordHash,
            role: Role.Mod,
            type: UserType.sender,
            phone: "+201000000002",
        },
    });

    // 4. Create Network Counterparty Members (Clients)
    const clientOne = await prisma.user.create({
        data: {
            username: "client_zayd",
            password: defaultPasswordHash,
            role: Role.Member,
            type: UserType.receiver,
            phone: "+201000000003",
        },
    });

    const clientTwo = await prisma.user.create({
        data: {
            username: "client_omar",
            password: defaultPasswordHash,
            role: Role.Member,
            type: UserType.receiver,
            phone: "+201000000004",
        },
    });

    console.log("👤 Base roles and user profiles provisioned.");

    // 5. Establish Initial Balance Frameworks & Seed Openings
    // Client Zayd starts with 10,000 USD
    const initialUsdAmount = new Prisma.Decimal(10000.0000);

    const transZayd = await prisma.transaction.create({
        data: {
            userId: clientOne.id,
            type: TransactionType.opening_balance,
            amount: initialUsdAmount,
            currency: Currency.USD,
            date: new Date(),
            notes: "System Migration Initial Opening Pool",
            createdBy: systemAdmin.id,
        }
    });

    await prisma.userBalance.create({
        data: {
            userId: clientOne.id,
            currency: Currency.USD,
            balance: initialUsdAmount,
        }
    });

    // Client Omar starts with 50,000 EGP
    const initialEgpAmount = new Prisma.Decimal(50000.0000);

    const transOmar = await prisma.transaction.create({
        data: {
            userId: clientTwo.id,
            type: TransactionType.opening_balance,
            amount: initialEgpAmount,
            currency: Currency.EGP,
            date: new Date(),
            notes: "Local Branch Initial Liquidity Match",
            createdBy: systemAdmin.id,
        }
    });

    await prisma.userBalance.create({
        data: {
            userId: clientTwo.id,
            currency: Currency.EGP,
            balance: initialEgpAmount,
        }
    });

    // 6. Log configuration entries into system Audit Logs
    await prisma.auditLog.createMany({
        data: [
            {
                userId: systemAdmin.id,
                action: "SYSTEM_SEED_INITIALIZATION",
                tableName: "users",
                recordId: systemAdmin.id,
                newValue: { description: "Root system migration seeding script executed." }
            },
            {
                userId: systemAdmin.id,
                action: "CREATE_TRANSACTION_OPENING_BALANCE",
                tableName: "transactions",
                recordId: transZayd.id,
                newValue: { target: "client_zayd", currency: "USD", initial: 10000 }
            },
            {
                userId: systemAdmin.id,
                action: "CREATE_TRANSACTION_OPENING_BALANCE",
                tableName: "transactions",
                recordId: transOmar.id,
                newValue: { target: "client_omar", currency: "EGP", initial: 50000 }
            }
        ]
    });

    console.log("📈 Financial Ledgers and audit arrays initialized.");
    console.log("🚀 Seeding routine finalized cleanly!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding Routine Fatal Crash:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
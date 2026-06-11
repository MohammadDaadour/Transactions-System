"use server"

import { auth } from "../../auth";
import { db } from "../../lib/db";
import { Currency, TransactionType } from "../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import { Prisma } from "../../generated/prisma/client";

interface CreateTransactionInput {
    userId: string;
    type: TransactionType;
    amount: number;
    currency: Currency;
    date: string;
    notes?: string;
}

export async function createHawalaTransaction(input: CreateTransactionInput) {
    // 1. Authenticate and enforce authorization
    const session = await auth();
    if (!session || !session.user?.id) {
        throw new Error("Unauthorized: You must be logged in to log transactions.");
    }

    if (session.user.role == "Member") {
        return { success: false, error: "Unauthorized: You do not have permission to log transactions." };
    }

    const creatorId = session.user.id;
    const { userId, type, amount, currency, date, notes } = input;

    if (amount <= 0) {
        return { success: false, error: "Amount must be greater than zero." };
    }

    try {
        const result = await db.$transaction(async (tx) => {

            const transaction = await tx.transaction.create({
                data: {
                    userId,
                    type,
                    amount: new Prisma.Decimal(amount),
                    currency,
                    date: new Date(date),
                    notes,
                    createdBy: creatorId,
                },
            });

            const currentBalanceRow = await tx.userBalance.upsert({
                where: {
                    userId_currency: { userId, currency }
                },
                update: {},
                create: {
                    userId,
                    currency,
                    balance: new Prisma.Decimal(0),
                }
            });

            const oldBalance = currentBalanceRow.balance;
            let newBalance = new Prisma.Decimal(oldBalance);

            if (type === TransactionType.debit) {
                newBalance = oldBalance.add(amount);
            } else if (type === TransactionType.credit) {
                newBalance = oldBalance.sub(amount);
            } else if (type === TransactionType.opening_balance) {
                newBalance = new Prisma.Decimal(amount);
            }

            await tx.userBalance.update({
                where: {
                    userId_currency: { userId, currency }
                },
                data: {
                    balance: newBalance
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: creatorId,
                    action: `CREATE_TRANSACTION_${type.toUpperCase()}`,
                    tableName: "transactions",
                    recordId: transaction.id,
                    oldValue: { balance: oldBalance.toNumber() } as Prisma.InputJsonValue,
                    newValue: {
                        transactionId: transaction.id,
                        amount,
                        currency,
                        resultingBalance: newBalance.toNumber()
                    } as Prisma.InputJsonValue,
                },
            });

            return transaction;
        });

        revalidatePath("/dashboard/transactions");
        revalidatePath(`/dashboard/users/${userId}`);

        return { success: true, data: { id: result.id } };

    } catch (error) {
        console.error("Hawala Ledger Transaction Failed:", error);
        return {
            success: false,
            error: "Critical Error: Transaction failed and rolled back securely to preserve ledger accuracy."
        };
    }
}

import { Currency, TransactionType } from "../generated/prisma/client";
import { db } from "../lib/db";

export interface TransactionFilters {
    userId?: string;
    type?: TransactionType;
    currency?: Currency;
    dateFrom?: string;
    dateTo?: string;
    sessionId?: string;
}

// Add the missing fields to match the 'TransactionRow' shape
const ledgerTransactionSelect = {
    id: true,
    amount: true,
    type: true,
    currency: true,
    createdAt: true,
    date: true,
    notes: true, // <-- Added because TransactionRow requires it
    user: {
        select: {
            id: true,
            name: true, // Will naturally map as string | null
        }
    },
    creator: {
        select: {
            id: true,
            name: true,
        }
    }
};

export async function getPaginatedTransactions(
    filters: TransactionFilters,
    page: number,
    pageSize: number
) {
    let targetSessionId = filters.sessionId;
    if (!targetSessionId) {
        const active = await db.session.findFirst({ where: { status: "OPEN" } });
        targetSessionId = active?.id;
    }

    const where = {
        ...(targetSessionId && { sessionId: targetSessionId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.type && { type: filters.type }),
        ...(filters.currency && { currency: filters.currency }),
        ...(filters.dateFrom || filters.dateTo ? {
            date: {
                ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
                ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
            }
        } : {}),
    };

    const [transactions, total] = await Promise.all([
        db.transaction.findMany({
            where,
            take: pageSize,
            skip: (page - 1) * pageSize,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                amount: true,
                type: true,
                currency: true,
                createdAt: true,
                date: true,
                notes: true, // Included for structural table stability
                user: {
                    select: {
                        id: true,
                        username: true, // Fixed database column name
                    }
                },
                creator: {
                    select: {
                        id: true,
                        username: true, // Fixed database column name
                    }
                }
            },
        }),
        db.transaction.count({ where }),
    ]);

    return {
        transactions: transactions.map(tx => ({
            id: tx.id,
            amount: tx.amount.toNumber(),
            type: tx.type,
            currency: tx.currency,
            createdAt: tx.createdAt,
            date: tx.date,
            notes: tx.notes ?? "",
            user: {
                id: tx.user.id,
                username: tx.user.username ?? "",
            },
            creator: {
                id: tx.creator.id,
                username: tx.creator.username ?? "",
            }
        })),
        total,
        pageCount: Math.ceil(total / pageSize),
    };
}

export async function getRecentLedger(userId?: string) {
    const activeSession = await db.session.findFirst({ where: { status: "OPEN" } });
    if (!activeSession) return [];

    const transactions = await db.transaction.findMany({
        where: {
            sessionId: activeSession.id,
            ...(userId && { userId })
        },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            amount: true,
            type: true,
            currency: true,
            createdAt: true,
            date: true,
            notes: true,
            user: {
                select: {
                    id: true,
                    username: true, 
                }
            },
            creator: {
                select: {
                    id: true,
                    username: true, 
                }
            }
        },
    });

    return transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount.toNumber(),
        type: tx.type,
        currency: tx.currency,
        createdAt: tx.createdAt,
        date: tx.date,
        notes: tx.notes ?? "",
        user: {
            id: tx.user.id,
            username: tx.user.username ?? "",
        },
        creator: {
            id: tx.creator.id,
            username: tx.creator.username ?? "",
        }
    }));
}

export async function getGlobalSystemBalances() {
    const activeSession = await db.session.findFirst({ where: { status: "OPEN" } });
    if (!activeSession) return [];

    const aggregates = await db.userBalance.groupBy({
        by: ['currency'],
        where: {
            sessionId: activeSession.id
        },
        _sum: {
            balance: true,
        },
    });

    return aggregates.map((item) => ({
        currency: item.currency,
        netPosition: item._sum.balance ? item._sum.balance.toNumber() : 0,
    }));
}
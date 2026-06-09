import { db } from "../lib/db";

export async function getGlobalSystemBalances() {
    const aggregates = await db.userBalance.groupBy({
        by: ['currency'],
        _sum: {
            balance: true,
        },
    });

    return aggregates.map((item) => ({
        currency: item.currency,
        netPosition: item._sum.balance ? item._sum.balance.toNumber() : 0,
    }));
}
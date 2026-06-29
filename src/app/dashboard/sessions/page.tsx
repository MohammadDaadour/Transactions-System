import { auth } from "../../../auth";
import { db } from "../../../lib/db";
import { redirect } from "next/navigation";
import SessionsHistoryClient from "./SessionsHistoryClient";

export const metadata = {
    title: "سجل الجلسات المحاسبية | نظام الحوالة",
    description: "عرض تاريخ الجلسات المحاسبية المغلقة وأرصدتها الختامية",
};

const STATUS_ORDER: Record<string, number> = { OPEN: 0, CLOSING: 1, CLOSED: 2 };

export default async function SessionsHistoryPage() {
    const session = await auth();
    if (!session || session.user?.role !== "Admin") redirect("/dashboard");

    const rawSessions = await db.session.findMany({
        orderBy: { openedAt: "desc" },
        include: {
            openedByUser: { select: { username: true } },
            closedByUser: { select: { username: true } },
            snapshots: {
                include: { user: { select: { username: true } } },
                orderBy: { currency: "asc" },
            },
            _count: { select: { transactions: true } },
        },
    });

    // Fix ordering: OPEN → CLOSING → CLOSED, then newest-first within each group
    const sessions = [...rawSessions].sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;
        return b.openedAt.getTime() - a.openedAt.getTime();
    });

    const serialized = sessions.map((s) => ({
        ...s,
        openedAt: s.openedAt.toISOString(),
        closedAt: s.closedAt?.toISOString() ?? null,
        snapshots: s.snapshots.map((snap) => ({
            ...snap,
            balance: snap.balance.toNumber(),
        })),
    }));

    return <SessionsHistoryClient sessions={serialized} />;
}
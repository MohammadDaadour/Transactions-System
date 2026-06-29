"use client";

import { useState } from "react";
import { Session } from "./types";
import { TransactionPanel } from "./TransactionPanel";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    OPEN:    { label: "نشطة",        color: "bg-green-900/40 text-green-400 border-green-800",   dot: "bg-green-500 animate-pulse" },
    CLOSING: { label: "جار الإغلاق", color: "bg-yellow-900/40 text-yellow-400 border-yellow-800", dot: "bg-yellow-500 animate-pulse" },
    CLOSED:  { label: "مغلقة",       color: "bg-hw-bg text-hw-text-secondary border-hw-border",   dot: "bg-hw-text-muted" },
};

const balanceStatusColors: Record<string, string> = {
    POSITIVE: "text-hw-accent",
    NEGATIVE: "text-red-400",
    ZERO:     "text-hw-text-muted",
};

export function SessionCard({ s, rates, ratesReady }: { s: Session; rates: { usd: number; aed: number; vod: number }; ratesReady: boolean }) {
    const [expanded, setExpanded] = useState(s.status === "OPEN");
    const [tab, setTab] = useState<"balances" | "transactions">("balances");

    const cfg = statusConfig[s.status];

    const duration = s.closedAt
        ? (() => {
            const diffMs = new Date(s.closedAt).getTime() - new Date(s.openedAt).getTime();
            const hrs  = Math.floor(diffMs / 3_600_000);
            const mins = Math.floor((diffMs % 3_600_000) / 60_000);
            return `${hrs}س ${mins}د`;
        })()
        : "جارية";

    const sessionTotal = s.snapshots.reduce((acc, snap) => {
        const bal = snap.balance;
        switch (snap.currency.toUpperCase()) {
            case "USD": return acc + bal * rates.usd;
            case "AED": return acc + bal * rates.aed;
            case "EGP": return acc + bal;
            case "VOD": return acc - bal * rates.vod;
            default:    return acc;
        }
    }, 0);

    return (
        <div className={`rounded-xl border overflow-hidden transition-all
            ${expanded ? "border-hw-accent/40 shadow-sm shadow-hw-accent/10" : "border-hw-border"}
            bg-hw-surface`}>

            {/* ── Header (always visible, clickable) ── */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4
                           border-b border-hw-border bg-hw-bg/40 hover:bg-hw-bg/60 transition text-right"
            >
                <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div>
                        <p className="text-xs font-mono text-hw-text-muted">{s.id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-sm font-medium text-hw-text">
                            {new Date(s.openedAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2.5 py-1 rounded-full border font-semibold ${cfg.color}`}>{cfg.label}</span>
                    {/* <span className="text-hw-text-secondary">
                        <span className="font-medium text-hw-text">{s._count.transactions}</span> قيود
                    </span> */}
                    <span className="text-hw-text-secondary">
                        المدة: <span className="font-mono text-hw-text">{duration}</span>
                    </span>
                    <span className="text-hw-text-secondary">
                        بواسطة <span className="text-hw-text">{s.openedByUser.username}</span>
                    </span>
                    {s.closedByUser && (
                        <span className="text-hw-text-secondary">
                            أغلق: <span className="text-hw-text">{s.closedByUser.username}</span>
                        </span>
                    )}
                    {ratesReady && s.snapshots.length > 0 && (
                        <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs
                            ${sessionTotal >= 0
                                ? "text-hw-accent border-hw-accent/30 bg-hw-accent/5"
                                : "text-red-400 border-red-800 bg-red-900/10"}`}>
                            {sessionTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه
                        </span>
                    )}
                    {/* Expand chevron */}
                    <span className={`text-hw-text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>▾</span>
                </div>
            </button>

            {/* ── Expandable body ── */}
            {expanded && (
                <div className="px-5 py-4 space-y-4">
                    {/* Tab switcher */}
                    <div className="flex gap-1 border-b border-hw-border pb-3">
                        {(["balances", "transactions"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-3 py-1.5 rounded-lg text-s font-medium transition
                                    ${tab === t
                                        ? "bg-hw-accent/10 text-hw-accent border border-hw-accent/30"
                                        : "text-hw-text-secondary hover:text-hw-text hover:bg-hw-bg border border-transparent"}`}
                            >
                                {/* `القيود (${s._count.transactions})` */}
                                {t === "balances" ? "الأرصدة الختامية" : ""}
                            </button>
                        ))}
                    </div>

                    {/* Balances tab */}
                    {tab === "balances" && (
                        s.snapshots.length === 0 ? (
                            <p className="text-sm text-gray-800-muted italic">
                                {s.status === "OPEN" ? "الجلسة لا تزال نشطة — لا توجد لقطة ختامية بعد." : "لا توجد أرصدة مسجلة."}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead>
                                        <tr className="text-xs uppercase tracking-wider text-gray-800-muted border-b border-hw-border">
                                            <th className="pb-2 font-medium">الحساب</th>
                                            <th className="pb-2 font-medium">العملة</th>
                                            <th className="pb-2 font-medium text-left">الرصيد الختامي</th>
                                            <th className="pb-2 font-medium text-center">الوضع</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hw-border/50">
                                        {s.snapshots.map((snap) => (
                                            <tr key={snap.id} className="hover:bg-hw-bg/30 transition">
                                                <td className="py-2.5 font-medium text-hw-text">{snap.user.username}</td>
                                                <td className="py-2.5">
                                                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-hw-bg border border-hw-border">
                                                        {snap.currency}
                                                    </span>
                                                </td>
                                                <td className={`py-2.5 font-mono font-bold text-left ${balanceStatusColors[snap.balanceStatus]}`}>
                                                    {snap.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2.5 text-center">
                                                    <span className={`text-xs font-semibold ${balanceStatusColors[snap.balanceStatus]}`}>
                                                        {snap.balanceStatus === "POSITIVE" ? "▲ دائن" :
                                                            snap.balanceStatus === "NEGATIVE" ? "▼ مدين" : "— متعادل"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* Transactions tab */}
                    {tab === "transactions" && (
                        <TransactionPanel sessionId={s.id} totalCount={s._count.transactions} />
                    )}

                    {s.notes && (
                        <p className="text-xs text-hw-text-secondary italic border-t border-hw-border/50 pt-3">
                            📝 {s.notes}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

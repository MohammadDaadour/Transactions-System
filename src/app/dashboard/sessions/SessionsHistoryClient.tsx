"use client";

import { useEffect, useState, useMemo } from "react";
import { Session } from "./components/types";
import { PriceInput } from "./components/PriceInput";
import { Pagination } from "./components/Pagination";
import { SessionCard } from "./components/SessionCard";

const STORAGE_KEY = "hw_exchange_rates";
const SESSIONS_PER_PAGE = 8;

export default function SessionsHistoryClient({ sessions }: { sessions: Session[] }) {
    const [usdPrice, setUsdPrice] = useState("");
    const [aedPrice, setAedPrice] = useState("");
    const [vodPrice, setVodPrice] = useState("");
    const [hydrated, setHydrated]   = useState(false);
    const [sessionPage, setSessionPage] = useState(1);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.aed) setAedPrice(parsed.aed);
                if (parsed.usd) setUsdPrice(parsed.usd);
                if (parsed.vod) setVodPrice(parsed.vod);
            }
        } catch {}
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ usd: usdPrice, aed: aedPrice, vod: vodPrice }));
    }, [usdPrice, aedPrice, vodPrice, hydrated]);

    const rates = useMemo(() => ({
        aed: parseFloat(aedPrice) || 0,
        usd: parseFloat(usdPrice) || 0,
        vod: parseFloat(vodPrice) || 0,
    }), [usdPrice, aedPrice, vodPrice]);
    const ratesReady = rates.usd > 0 && rates.aed > 0 && rates.vod > 0;
    

    const grandTotal = useMemo(() =>
        sessions.reduce((acc, s) =>
            acc + s.snapshots.reduce((sacc, snap) => {
                const bal = snap.balance;
                switch (snap.currency.toUpperCase()) {
                    case "AED": return sacc + bal * rates.aed;
                    case "USD": return sacc + bal * rates.usd;
                    case "EGP": return sacc + bal;
                    case "VOD": return sacc - bal * rates.vod;
                    default:   
                    return sacc;
                }
            }, 0), 0),
    [sessions, rates]);

    // Session-level pagination
    const sessionPageCount = Math.ceil(sessions.length / SESSIONS_PER_PAGE);
    const pagedSessions = sessions.slice(
        (sessionPage - 1) * SESSIONS_PER_PAGE,
        sessionPage * SESSIONS_PER_PAGE
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="border-b border-hw-border pb-5">
                <h2 className="text-2xl font-bold tracking-tight">سجل الجلسات المحاسبية</h2>
                <p className="text-sm text-hw-text-secondary mt-1">
                    عرض جميع الفترات المحاسبية وأرصدتها الختامية المحفوظة.
                </p>
            </div>

            {/* Exchange rate inputs */}
            <div className="rounded-xl border border-hw-border bg-hw-surface p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-hw-text">أسعار الصرف</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <PriceInput label="سعر الفودافون (VOD → جنيه)" value={vodPrice} onChange={setVodPrice} />
                    <PriceInput label="سعر الدولار (USD → جنيه)"   value={usdPrice} onChange={setUsdPrice} />
                    <PriceInput label="سعر الدرهم (AED → جنيه)"    value={aedPrice} onChange={setAedPrice} />
                </div>
            </div>

            {/* Grand total banner */}
            <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition
                ${ratesReady ? "border-hw-accent/40 bg-hw-accent/5" : "border-hw-border bg-hw-surface opacity-60"}`}>
                <div>
                    <p className="text-sm font-semibold text-hw-text">الإجمالي الكلي بالجنيه المصري</p>
                    {/* <p className="text-xs text-hw-text-secondary mt-0.5">
                        جميع الجلسات — EGP + (USD × {rates.usd || "؟"}) + (AED × {rates.aed || "؟"}) − (VOD × {rates.vod || "؟"})
                    </p> */}
                </div>
                <div className="text-left">
                    {ratesReady ? (
                        <p className={`text-3xl font-bold font-mono ${grandTotal >= 0 ? "text-hw-accent" : "text-red-500"}`}>
                            {grandTotal.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-sm font-normal text-hw-text-muted mr-2">جنيه</span>
                        </p>
                    ) : (
                        <p className="text-sm text-hw-text-muted italic">أدخل الأسعار أولاً لحساب الإجمالي</p>
                    )}
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "إجمالي الجلسات", value: sessions.length },
                    { label: "جلسات مغلقة",    value: sessions.filter(s => s.status === "CLOSED").length },
                    { label: "جلسة نشطة",      value: sessions.filter(s => s.status === "OPEN").length },
                ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-hw-border bg-hw-surface p-4 text-center">
                        <p className="text-3xl font-bold font-mono text-hw-text">{stat.value}</p>
                        <p className="text-xs text-hw-text-secondary mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Sessions list */}
            <div className="space-y-3">
                {pagedSessions.map((s) => (
                    <SessionCard key={s.id} s={s} rates={rates} ratesReady={ratesReady} />
                ))}

                {sessions.length === 0 && (
                    <div className="text-center py-16 text-hw-text-muted italic">
                        لا توجد جلسات محاسبية بعد.
                    </div>
                )}
            </div>

            {/* Session pagination */}
            <Pagination
                page={sessionPage}
                pageCount={sessionPageCount}
                onChange={(p) => { setSessionPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            />
        </div>
    );
}
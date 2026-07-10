"use client";

import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { reverseTransaction } from "../app/actions/reversals";
import { Pagination } from "../app/dashboard/sessions/components/Pagination";

interface TransactionRow {
    id: string;
    type: string;
    amount: number;
    currency: string;
    date: Date | string;
    notes: string | null;
    user: { username: string };
    creator: { username: string };
}

interface Props {
    userId: string;
    showReversalControl: boolean;
}

const TX_PER_PAGE = 10;

export function UserTransactionPanel({ userId, showReversalControl }: Props) {
    const [txPage, setTxPage] = useState(1);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    const fetchTx = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${userId}/transactions?page=${p}&pageSize=${TX_PER_PAGE}`);
            const data = await res.json();
            setTransactions(data.transactions ?? []);
            setPageCount(data.pageCount ?? 0);
        } finally {
            setLoading(false);
            setFetched(true);
        }
    }, [userId]);

    useEffect(() => { fetchTx(txPage); }, [txPage, fetchTx]);

    async function handleReversal(id: string) {
        const result = await Swal.fire({
            title: 'تأكيد العملية',
            text: 'هل تريد تأكيد مسح العملية؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#90AB8B',
            cancelButtonColor: '#1e293b'
        });

        if (!result.isConfirmed) return;

        const response = await reverseTransaction(id, "");

        if (response.success) {
            await Swal.fire({
                title: 'تم بنجاح',
                text: 'تمت تسوية بند الدفتر بنجاح.',
                icon: 'success',
                confirmButtonText: 'موافق'
            });
            fetchTx(txPage); // Refresh the current page
        } else {
            await Swal.fire({
                title: 'خطأ',
                text: `حدث خطأ: ${response.error}`,
                icon: 'error',
                confirmButtonText: 'موافق'
            });
        }
    }

    if (!fetched && loading) {
        return (
            <div className="flex items-center justify-center py-8 text-hw-text-muted text-sm gap-2">
                <span className="inline-block w-4 h-4 border-2 border-hw-accent border-t-transparent rounded-full animate-spin" />
                جار التحميل…
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-hw-border bg-hw-surface">
                <table className="w-full text-right text-sm text-hw-text-secondary">
                    <thead className="bg-hw-bg text-xs font-semibold uppercase tracking-wider text-hw-text-secondary border-b border-hw-border">
                        <tr>
                            <th className="px-4 py-3">التاريخ</th>
                            <th className="px-4 py-3">اسم الحساب</th>
                            <th className="px-4 py-3">النوع</th>
                            <th className="px-4 py-3 text-right">المبلغ</th>
                            <th className="px-4 py-3">ملاحظات</th>
                            <th className="px-4 py-3">المسؤول</th>
                            {showReversalControl && <th className="px-4 py-3 text-center">الإجراء</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hw-border font-normal">
                        {loading && fetched ? (
                            Array.from({ length: TX_PER_PAGE }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={showReversalControl ? 7 : 6} className="px-4 py-3">
                                        <div className="h-4 rounded bg-hw-border/40 w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan={showReversalControl ? 7 : 6} className="text-center py-8 text-hw-text-muted italic">لا يوجد قيود محاسبية.</td>
                            </tr>
                        ) : (
                            transactions.map((tx) => {
                                const isReversal = tx.notes?.includes("REVERSAL");
                                return (
                                    <tr key={tx.id} className={`hover:bg-hw-bg/50 transition ${isReversal ? "bg-hw-warning-bg text-hw-text-secondary" : ""}`}>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{new Date(tx.date).toLocaleDateString("ar-EG")}</td>
                                        <td className="px-4 py-3 font-medium text-hw-text">{tx.user.username}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium font-mono uppercase ${tx.type === "debit" ? "bg-hw-accent-muted text-gray-100" :
                                                tx.type === "credit" ? "bg-hw-danger-muted text-hw-danger" : "bg-hw-info-muted text-hw-info"
                                                }`}>
                                                {tx.type === "debit" ? "مدين لنا" : tx.type === "credit" ? "دائن علينا" : tx.type === "opening_balance" ? "رصيد افتتاحي" : tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                            {tx.amount.toLocaleString("ar-EG", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} <span className="text-xs text-hw-text-muted font-normal">{tx.currency}</span>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate text-xs" title={tx.notes || ""}>{tx.notes || "—"}</td>
                                        <td className="px-4 py-3 text-hw-text-secondary text-xs">{tx.creator.username}</td>
                                        {showReversalControl && (
                                            <td className="px-4 py-3 text-center">
                                                {!isReversal ? (
                                                    <button onClick={() => handleReversal(tx.id)} className="text-sm bg-hw-danger px-2 border border-hw-danger-muted text-hw-danger-muted hover:text-hw-danger-muted/80 font-medium underline transition">
                                                        تراجع
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-hw-warning font-mono uppercase font-semibold">تم التراجع</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {pageCount > 1 && (
                <Pagination page={txPage} pageCount={pageCount} onChange={(p) => setTxPage(p)} />
            )}
        </div>
    );
}

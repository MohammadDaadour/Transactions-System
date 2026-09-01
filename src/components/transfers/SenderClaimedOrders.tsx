"use client";

/**
 * SenderClaimedOrders
 *
 * Shows the currently-authenticated sender's own TAKEN (claimed) orders,
 * with a "Mark Done" button for each. Updates in real time when order:taken
 * arrives (a new order was claimed by this sender) or order:done fires.
 *
 * This component reuses the GET /api/transfer-orders/mine equivalent by
 * fetching all sender-specific TAKEN orders from a dedicated endpoint.
 */

import { useEffect, useState, useCallback } from "react";
import { useTransferSocket } from "./useTransferSocket";
import { CURRENCY_LABELS, TransferOrder } from "./SenderQueue";

export default function SenderClaimedOrders() {
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  const fetchClaimed = useCallback(async () => {
    try {
      const res = await fetch("/api/transfer-orders/claimed");
      if (!res.ok) return;
      const data: TransferOrder[] = await res.json();
      setOrders(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClaimed();
  }, [fetchClaimed]);

  useTransferSocket({
    // When this sender claims an order, add it to the claimed list
    onOrderTaken: (raw) => {
      const o = raw as TransferOrder;
      // Only add if this sender claimed it (senderId check happens server-side;
      // the event is broadcast to all senders so we check locally)
      fetchClaimed();
    },
    onReconnect: fetchClaimed,
  });

  const handleMarkDone = useCallback(
    async (order: TransferOrder) => {
      if (markingIds.has(order.id)) return;
      setMarkingIds((prev) => new Set(prev).add(order.id));

      try {
        const res = await fetch(`/api/transfer-orders/${order.id}/done`, {
          method: "POST",
        });

        if (res.ok) {
          // Remove from the claimed list immediately
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        }
      } finally {
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }
    },
    [markingIds]
  );

  if (loading) return null;
  if (orders.length === 0) return null;

  return (
    <section style={{ direction: "rtl" }}>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--hw-accent)",
          margin: "0 0 1rem",
        }}
      >
        طلباتك المحجوزة
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {orders.map((order) => {
          const amount =
            typeof order.amount === "string"
              ? parseFloat(order.amount)
              : order.amount;
          const marking = markingIds.has(order.id);

          return (
            <div
              key={order.id}
              style={{
                background: "var(--hw-surface)",
                border: "1px solid rgba(56,189,248,0.3)",
                borderRadius: "0.875rem",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: "rgba(56,189,248,0.12)",
                  color: "#124054ff",
                  border: "1px solid #124054ff",
                }}
              >
                محجوز
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, margin: "0 0 0.15rem", fontSize: "0.95rem" }}>
                  {order.name}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    fontSize: "0.8rem",
                    color: "var(--hw-text)",
                    flexWrap: "wrap",
                  }}
                >
                  <span>{CURRENCY_LABELS[order.currency] ?? order.currency}</span>
                  <span style={{ fontFamily: "monospace", direction: "ltr" }}>
                    {order.number}
                  </span>
                  {order.receiver && (
                    <span>المرسِل: {order.receiver.username}</span>
                  )}
                </div>
              </div>

              <div style={{ flexShrink: 0, textAlign: "left" }}>
                <p
                  style={{
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: "var(--hw-accent)",
                    margin: "0 0 0.5rem",
                  }}
                >
                  {amount.toLocaleString("en-US")}
                </p>

                <button
                  id={`done-${order.id}`}
                  disabled={marking}
                  onClick={() => handleMarkDone(order)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "0.4rem",
                    border: "none",
                    cursor: marking ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    background: marking
                      ? "var(--hw-disabled-bg)"
                      : "var(--hw-accent-solid)",
                    color: marking ? "var(--hw-disabled-text)" : "#fff",
                    transition: "background 0.2s",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  {marking ? "..." : "تم التحويل ✓"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

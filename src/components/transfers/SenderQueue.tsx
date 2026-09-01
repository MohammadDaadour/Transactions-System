"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTransferSocket } from "./useTransferSocket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type TransferOrder = {
  id: string;
  name: string;
  amount: string | number;
  number: string;
  currency: string;
  status: "PENDING" | "TAKEN" | "DONE" | "CANCELLED";
  receiverId: string;
  senderId: string | null;
  createdAt: string;
  receiver?: { id: string; username: string };
  sender?: { id: string; username: string };
};

// Arabic display labels for TransferCurrency enum values
export const CURRENCY_LABELS: Record<string, string> = {
  VODAFONE_CASH: "تحويل فودافون كاش",
  BANK_TRANSFER: "تحويل بنكى",
  CASH_EGP: "تحويل جنيه نقدى",
  AED: "درهم اماراتى",
  KWD: "دينار كويتى",
  SWIFT_CHINA: "سويفت الصين",
  SWIFT_KOREA: "سويفت كوريا",
  SWIFT_AUSTRALIA: "سويفت استراليا",
};

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------
type Toast = { id: number; message: string; type: "success" | "error" | "info" };

let toastId = 0;

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "0.5rem",
            background:
              t.type === "error"
                ? "#7f1d1d"
                : t.type === "success"
                ? "#14532d"
                : "#1e3a5f",
            color: "#f1f5f9",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            fontSize: "0.875rem",
            cursor: "pointer",
            maxWidth: "320px",
            direction: "rtl",
          }}
          onClick={() => remove(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SenderQueue component
// ---------------------------------------------------------------------------
export default function SenderQueue() {
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch (used on mount and on WS reconnect)
  // ---------------------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/transfer-orders");
      if (!res.ok) return;
      const data: TransferOrder[] = await res.json();
      setOrders(data);
    } catch {
      // Network error — ignore, polling will retry
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ---------------------------------------------------------------------------
  // 30-second polling fallback — backstop for missed WS broadcasts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(fetchOrders, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ---------------------------------------------------------------------------
  // WebSocket event handlers
  // ---------------------------------------------------------------------------
  const handleOrderNew = useCallback((order: unknown) => {
    const o = order as TransferOrder;
    setOrders((prev) => {
      // Prevent duplicates (poll + socket race)
      if (prev.find((x) => x.id === o.id)) return prev;
      return [o, ...prev];
    });
  }, []);

  const handleOrderTaken = useCallback((order: unknown) => {
    const o = order as TransferOrder;
    setOrders((prev) => prev.filter((x) => x.id !== o.id));
  }, []);

  const handleOrderClaimFailed = useCallback(
    (data: unknown) => {
      addToast("تم أخذ هذا الطلب بالفعل", "error");
      // Re-fetch to get the real current state
      fetchOrders();
    },
    [addToast, fetchOrders]
  );

  useTransferSocket({
    onOrderNew: handleOrderNew,
    onOrderTaken: handleOrderTaken,
    // onOrderDone not relevant for sender queue
    onOrderClaimFailed: handleOrderClaimFailed,
    onReconnect: () => {
      // Re-sync after reconnect so we don't show stale orders
      fetchOrders();
    },
  });

  // ---------------------------------------------------------------------------
  // Claim handler with optimistic update + rollback
  // ---------------------------------------------------------------------------
  const handleClaim = useCallback(
    async (order: TransferOrder) => {
      if (claimingIds.has(order.id)) return;

      // Optimistically remove from list
      setOrders((prev) => prev.filter((x) => x.id !== order.id));
      setClaimingIds((prev) => new Set(prev).add(order.id));

      try {
        const res = await fetch(`/api/transfer-orders/${order.id}/claim`, {
          method: "POST",
        });

        if (res.status === 409) {
          // Lost the race — roll back the optimistic removal
          setOrders((prev) => {
            if (prev.find((x) => x.id === order.id)) return prev;
            return [order, ...prev].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
          addToast("تم أخذ هذا الطلب بالفعل", "error");
        } else if (!res.ok) {
          setOrders((prev) => {
            if (prev.find((x) => x.id === order.id)) return prev;
            return [order, ...prev];
          });
          addToast("حدث خطأ أثناء محاولة الحجز", "error");
        } else {
          addToast("تم حجز الطلب بنجاح ✓", "success");
        }
      } catch {
        // Network error — roll back
        setOrders((prev) => {
          if (prev.find((x) => x.id === order.id)) return prev;
          return [order, ...prev];
        });
        addToast("خطأ في الاتصال، حاول مرة أخرى", "error");
      } finally {
        setClaimingIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }
    },
    [claimingIds, addToast]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ direction: "rtl" }}>
      <ToastContainer toasts={toasts} remove={removeToast} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--hw-accent)",
              margin: 0,
            }}
          >
            قائمة طلبات التحويل
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--hw-text-muted)",
              marginTop: "0.25rem",
            }}
          >
            الطلبات المتاحة للحجز — تتحدث تلقائيًا
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            color: "var(--hw-text-muted)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
              boxShadow: "0 0 0 2px rgba(34,197,94,0.3)",
              animation: "pulse 2s infinite",
            }}
          />
          مباشر
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "4rem",
            color: "var(--hw-text-muted)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid var(--hw-border)",
              borderTopColor: "var(--hw-accent-solid)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "5rem 2rem",
            color: "var(--hw-text)",
            background: "var(--hw-surface)",
            borderRadius: "1rem",
            border: "1px dashed var(--hw-border)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
          <p style={{ fontSize: "1.125rem", fontWeight: 500 }}>
            لا توجد طلبات تحويل متاحة حاليًا
          </p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            ستظهر الطلبات الجديدة هنا فور إرسالها
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              claiming={claimingIds.has(order.id)}
              onClaim={handleClaim}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderCard
// ---------------------------------------------------------------------------
function OrderCard({
  order,
  claiming,
  onClaim,
}: {
  order: TransferOrder;
  claiming: boolean;
  onClaim: (o: TransferOrder) => void;
}) {
  const amount =
    typeof order.amount === "string"
      ? parseFloat(order.amount)
      : order.amount;

  return (
    <div
      style={{
        background: "var(--hw-surface)",
        border: "1px solid var(--hw-border)",
        borderRadius: "0.875rem",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        animation: "slideIn 0.25s ease",
        transition: "box-shadow 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 24px rgba(0,0,0,0.15)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "var(--hw-text)" }}>
            {order.name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--hw-text)", margin: "0.2rem 0 0" }}>
            {order.receiver?.username ?? "—"}
          </p>
        </div>
        <span
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "999px",
            fontSize: "0.7rem",
            fontWeight: 600,
            background: "rgba(251, 191, 36, 0.15)",
            color: "#513606ff",
            border: "1px solid #513606ff",
          }}
        >
          قيد الانتظار
        </span>
      </div>

      {/* Amount + Currency */}
      <div
        style={{
          background: "rgba(0,0,0,0.08)",
          borderRadius: "0.5rem",
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--hw-accent)" }}>
          {amount.toLocaleString("en-US")}
        </span>
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--hw-text-secondary)",
            textAlign: "left",
          }}
        >
          {CURRENCY_LABELS[order.currency] ?? order.currency}
        </span>
      </div>

      {/* Phone number */}
      <div style={{ fontSize: "0.875rem", color: "var(--hw-text-secondary)" }}>
        <span style={{ color: "var(--hw-text)" }}>رقم الهاتف: </span>
        <span style={{ fontFamily: "monospace", fontWeight: 600, direction: "ltr", display: "inline-block" }}>
          {order.number}
        </span>
      </div>

      {/* Timestamp */}
      <p style={{ fontSize: "0.7rem", color: "var(--hw-text)", margin: 0 }}>
        {new Date(order.createdAt).toLocaleString("ar-EG")}
      </p>

      {/* Claim button */}
      <button
        id={`claim-${order.id}`}
        disabled={claiming}
        onClick={() => onClaim(order)}
        style={{
          marginTop: "0.25rem",
          padding: "0.65rem 1rem",
          borderRadius: "0.5rem",
          border: "none",
          cursor: claiming ? "not-allowed" : "pointer",
          fontWeight: 700,
          fontSize: "0.9rem",
          background: claiming
            ? "var(--hw-disabled-bg)"
            : "var(--hw-accent-solid)",
          color: claiming ? "var(--hw-disabled-text)" : "#fff",
          transition: "background 0.2s, transform 0.1s",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!claiming)
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--hw-accent-solid-hover)";
        }}
        onMouseLeave={(e) => {
          if (!claiming)
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--hw-accent-solid)";
        }}
        onMouseDown={(e) => {
          if (!claiming)
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {claiming ? "جارى الحجز..." : "حجز الطلب"}
      </button>
    </div>
  );
}

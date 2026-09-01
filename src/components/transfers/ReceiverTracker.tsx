"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTransferSocket } from "./useTransferSocket";
import { CURRENCY_LABELS, TransferOrder } from "./SenderQueue";
import { TransferCurrency } from "../../generated/prisma/client";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  PENDING: {
    label: "قيد الانتظار",
    bg: "rgba(251,191,36,0.12)",
    color: "#513606ff",
    border: "#774d07ff",
  },
  TAKEN: {
    label: "تم الحجز",
    bg: "rgba(56,189,248,0.12)",
    color: "#124054ff",
    border: "#124054ff",
  },
  DONE: {
    label: "تم التحويل ✓",
    bg: "rgba(34,197,94,0.12)",
    color: "#0f5629ff",
    border: "#0f5629ff",
  },
  CANCELLED: {
    label: "ملغى",
    bg: "rgba(100,116,139,0.12)",
    color: "#94a3b8",
    border: "rgba(100,116,139,0.3)",
  },
};

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------
type FormValues = {
  name: string;
  amount: string;
  number: string;
  currency: TransferCurrency | "";
};

const INITIAL_FORM: FormValues = {
  name: "",
  amount: "",
  number: "",
  currency: "",
};

// ---------------------------------------------------------------------------
// ReceiverTracker
// ---------------------------------------------------------------------------
export default function ReceiverTracker({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormValues>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch own orders
  // ---------------------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/transfer-orders/mine");
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
    fetchOrders();
  }, [fetchOrders]);

  // ---------------------------------------------------------------------------
  // WebSocket — listen on receiver:{userId} room (joined server-side)
  // ---------------------------------------------------------------------------
  useTransferSocket({
    onOrderTaken: (raw) => {
      const updated = raw as TransferOrder;
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      );
    },
    onOrderDone: (raw) => {
      const updated = raw as TransferOrder;
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      );
    },
    onReconnect: fetchOrders,
  });

  // ---------------------------------------------------------------------------
  // Form submission — create new order
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim() || !form.amount || !form.number.trim() || !form.currency) {
      setFormError("جميع الحقول مطلوبة");
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError("أدخل مبلغًا صحيحًا");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transfer-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          number: form.number.trim(),
          currency: form.currency,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "خطأ غير متوقع" }));
        setFormError(err.error ?? "خطأ أثناء إرسال الطلب");
        return;
      }

      const newOrder: TransferOrder = await res.json();
      setOrders((prev) => [newOrder, ...prev]);
      setForm(INITIAL_FORM);
    } catch {
      setFormError("خطأ في الاتصال، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ── Create order form ── */}
      <section
        style={{
          background: "var(--hw-surface)",
          border: "1px solid var(--hw-border)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--hw-accent)",
            margin: "0 0 1.25rem",
          }}
        >
          إرسال طلب تحويل جديد
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
        >
          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label
              htmlFor="recv-name"
              style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}
            >
              الاسم
            </label>
            <input
              id="recv-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="اسم المستلم"
              style={inputStyle}
            />
          </div>

          {/* Amount */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label
              htmlFor="recv-amount"
              style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}
            >
              المبلغ
            </label>
            <input
              id="recv-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>

          {/* Phone number */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label
              htmlFor="recv-number"
              style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}
            >
              رقم الهاتف / الحساب
            </label>
            <input
              id="recv-number"
              type="text"
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              placeholder="01xxxxxxxxx"
              style={{ ...inputStyle, direction: "ltr", textAlign: "left" }}
            />
          </div>

          {/* Currency */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label
              htmlFor="recv-currency"
              style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}
            >
              نوع التحويل
            </label>
            <select
              id="recv-currency"
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency: e.target.value as TransferCurrency }))
              }
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">-- اختر نوع التحويل --</option>
              {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {formError && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "0.6rem 1rem",
                background: "var(--hw-danger-bg)",
                border: "1px solid var(--hw-danger-border)",
                borderRadius: "0.5rem",
                color: "var(--hw-danger)",
                fontSize: "0.875rem",
              }}
            >
              {formError}
            </div>
          )}

          {/* Submit */}
          <button
            id="recv-submit"
            type="submit"
            disabled={submitting}
            style={{
              gridColumn: "1 / -1",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "0.95rem",
              background: submitting ? "var(--hw-disabled-bg)" : "var(--hw-accent-solid)",
              color: submitting ? "var(--hw-disabled-text)" : "#fff",
              transition: "background 0.2s",
              fontFamily: "inherit",
            }}
          >
            {submitting ? "جارى الإرسال..." : "إرسال الطلب"}
          </button>
        </form>
      </section>

      {/* ── Orders list ── */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--hw-accent)",
              margin: 0,
            }}
          >
            طلباتي
          </h2>
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
                animation: "pulse 2s infinite",
              }}
            />
            يتحدث تلقائيًا
          </div>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "4rem",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
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
              padding: "3rem",
              color: "var(--hw-text-muted)",
              background: "var(--hw-surface)",
              borderRadius: "1rem",
              border: "1px dashed var(--hw-border)",
            }}
          >
            <p>لا توجد طلبات بعد. أرسل طلبك الأول أعلاه.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {orders.map((order) => (
              <ReceiverOrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row component for a single receiver order
// ---------------------------------------------------------------------------
function ReceiverOrderRow({ order }: { order: TransferOrder }) {
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  const amount =
    typeof order.amount === "string" ? parseFloat(order.amount) : order.amount;

  return (
    <div
      style={{
        background: "var(--hw-surface)",
        border: "1px solid var(--hw-border)",
        borderRadius: "0.875rem",
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 16px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Status badge */}
      <span
        style={{
          flexShrink: 0,
          padding: "0.3rem 0.75rem",
          borderRadius: "999px",
          fontSize: "0.75rem",
          fontWeight: 700,
          background: status.bg,
          color: status.color,
          border: `1px solid ${status.border}`,
          whiteSpace: "nowrap",
        }}
      >
        {status.label}
      </span>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, margin: "0 0 0.15rem", fontSize: "0.95rem" }}>
          {order.name}
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            fontSize: "0.8rem",
            color: "var(--hw-text-muted)",
            flexWrap: "wrap",
          }}
        >
          <span>{CURRENCY_LABELS[order.currency] ?? order.currency}</span>
          <span style={{ fontFamily: "monospace", direction: "ltr" }}>
            {order.number}
          </span>
          {order.sender && (
            <span>المحوِّل: {order.sender.username}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: "left", flexShrink: 0 }}>
        <p
          style={{
            fontWeight: 800,
            fontSize: "1.1rem",
            color: "var(--hw-accent-solid)",
            margin: 0,
          }}
        >
          {amount.toLocaleString("ar-EG")}
        </p>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--hw-text-muted)",
            margin: "0.1rem 0 0",
            textAlign: "right",
          }}
        >
          {new Date(order.createdAt).toLocaleDateString("ar-EG")}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared input style
// ---------------------------------------------------------------------------
const inputStyle: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--hw-border)",
  background: "var(--hw-bg)",
  color: "var(--hw-text)",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

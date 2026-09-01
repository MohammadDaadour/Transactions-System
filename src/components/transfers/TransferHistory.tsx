"use client";

/**
 * TransferHistory
 *
 * Shows paginated, filterable history of completed / cancelled transfer orders
 * for the currently logged-in user.
 *
 * - Senders  : sees DONE orders they executed.
 * - Receivers: sees DONE + CANCELLED orders they created, with status filter.
 */

import { useCallback, useEffect, useState } from "react";
import { CURRENCY_LABELS, TransferOrder } from "./SenderQueue";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type HistoryResponse = {
  data: TransferOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Filters = {
  search: string;
  status: "ALL" | "DONE" | "CANCELLED";
  currency: string;
  from: string;
  to: string;
};

const INITIAL_FILTERS: Filters = {
  search: "",
  status: "ALL",
  currency: "",
  from: "",
  to: "",
};

// ---------------------------------------------------------------------------
// Status badge config (matches ReceiverTracker)
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> =
  {
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
// Shared input style (mirrors ReceiverTracker)
// ---------------------------------------------------------------------------
const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.8rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--hw-border)",
  background: "var(--hw-bg)",
  color: "var(--hw-text)",
  fontSize: "0.85rem",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TransferHistory({ userType }: { userType: "sender" | "receiver" }) {
  const [response, setResponse] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  // Staged filters — applied only when user hits "بحث" or clears
  const [applied, setApplied] = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchHistory = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("pageSize", "15");
      if (f.status !== "ALL") params.set("status", f.status);
      if (f.currency) params.set("currency", f.currency);
      if (f.search) params.set("search", f.search);
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);

      const res = await fetch(`/api/transfer-orders/history?${params.toString()}`);
      if (!res.ok) return;
      const data: HistoryResponse = await res.json();
      setResponse(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(applied, page);
  }, [fetchHistory, applied, page]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleApply = () => {
    setPage(1);
    setApplied({ ...filters });
  };

  const handleClear = () => {
    const reset = { ...INITIAL_FILTERS };
    setFilters(reset);
    setApplied(reset);
    setPage(1);
  };

  const hasActiveFilters =
    applied.search || applied.status !== "ALL" || applied.currency || applied.from || applied.to;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ direction: "rtl", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Filter bar ── */}
      <section
        style={{
          background: "var(--hw-surface)",
          border: "1px solid var(--hw-border)",
          borderRadius: "1rem",
          padding: "1.25rem 1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--hw-text-secondary)",
            margin: "0 0 1rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          🔍 تصفية النتائج
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "0.75rem",
            alignItems: "end",
          }}
        >
          {/* Search */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}>
              الاسم / رقم الهاتف
            </label>
            <input
              id="history-search"
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              placeholder="ابحث..."
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          {/* Status — receivers only */}
          {userType === "receiver" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}>
                الحالة
              </label>
              <select
                id="history-status"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))
                }
                style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
              >
                <option value="ALL">الكل</option>
                <option value="DONE">تم التحويل</option>
                <option value="CANCELLED">ملغى</option>
              </select>
            </div>
          )}

          {/* Currency */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}>
              نوع التحويل
            </label>
            <select
              id="history-currency"
              value={filters.currency}
              onChange={(e) => setFilters((f) => ({ ...f, currency: e.target.value }))}
              style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
            >
              <option value="">الكل</option>
              {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}>
              من تاريخ
            </label>
            <input
              id="history-from"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              style={{ ...inputStyle, width: "100%", direction: "ltr" }}
            />
          </div>

          {/* Date to */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--hw-text-secondary)" }}>
              إلى تاريخ
            </label>
            <input
              id="history-to"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              style={{ ...inputStyle, width: "100%", direction: "ltr" }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <button
              id="history-apply"
              onClick={handleApply}
              style={{
                flex: 1,
                padding: "0.55rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
                background: "var(--hw-accent-solid)",
                color: "#fff",
                fontFamily: "inherit",
                transition: "background 0.2s",
              }}
            >
              بحث
            </button>
            {hasActiveFilters && (
              <button
                id="history-clear"
                onClick={handleClear}
                style={{
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--hw-border)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  background: "transparent",
                  color: "var(--hw-text-secondary)",
                  fontFamily: "inherit",
                  transition: "background 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                مسح ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      <section>
        {/* Summary header */}
        {response && !loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <p style={{ fontSize: "0.8rem", color: "var(--hw-text-secondary)", margin: 0 }}>
              {response.total === 0
                ? "لا توجد نتائج"
                : `عرض ${(response.page - 1) * response.pageSize + 1}–${Math.min(
                    response.page * response.pageSize,
                    response.total
                  )} من أصل ${response.total.toLocaleString("ar-EG")} طلب`}
            </p>
            {response.totalPages > 1 && (
              <p style={{ fontSize: "0.8rem", color: "var(--hw-text-secondary)", margin: 0 }}>
                صفحة {response.page} من {response.totalPages}
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
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
        ) : !response || response.data.length === 0 ? (
          /* Empty state */
          <div
            style={{
              textAlign: "center",
              padding: "5rem 2rem",
              color: "var(--hw-text-muted)",
              background: "var(--hw-surface)",
              borderRadius: "1rem",
              border: "1px dashed var(--hw-border)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📂</div>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
              لا توجد طلبات في السجل
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--hw-text-secondary)", margin: 0 }}>
              {hasActiveFilters
                ? "حاول تغيير معايير البحث أو امسح الفلاتر"
                : "ستظهر الطلبات المكتملة والملغاة هنا"}
            </p>
          </div>
        ) : (
          /* Orders list */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {response.data.map((order) => (
              <HistoryRow key={order.id} order={order} userType={userType} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {response && response.totalPages > 1 && !loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              id="history-prev"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={paginationBtnStyle(page === 1)}
            >
              ← السابق
            </button>

            {/* Page number pills */}
            {Array.from({ length: response.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === response.totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{ color: "var(--hw-text-secondary)", fontSize: "0.85rem", padding: "0 0.25rem" }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    id={`history-page-${item}`}
                    onClick={() => setPage(item as number)}
                    style={paginationBtnStyle(false, item === page)}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              id="history-next"
              onClick={() => setPage((p) => Math.min(response.totalPages, p + 1))}
              disabled={page === response.totalPages}
              style={paginationBtnStyle(page === response.totalPages)}
            >
              التالي →
            </button>
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination button style helper
// ---------------------------------------------------------------------------
function paginationBtnStyle(disabled: boolean, active = false): React.CSSProperties {
  return {
    padding: "0.45rem 0.9rem",
    borderRadius: "0.5rem",
    border: active
      ? "1px solid var(--hw-accent-solid)"
      : "1px solid var(--hw-border)",
    background: active
      ? "var(--hw-accent-solid)"
      : disabled
      ? "transparent"
      : "var(--hw-surface)",
    color: active ? "#fff" : disabled ? "var(--hw-text-muted)" : "var(--hw-text)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: active ? 700 : 500,
    fontSize: "0.85rem",
    fontFamily: "inherit",
    transition: "all 0.15s",
    opacity: disabled ? 0.45 : 1,
  };
}

// ---------------------------------------------------------------------------
// Single history row
// ---------------------------------------------------------------------------
function HistoryRow({
  order,
  userType,
}: {
  order: TransferOrder;
  userType: "sender" | "receiver";
}) {
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.DONE;
  const amount = typeof order.amount === "string" ? parseFloat(order.amount) : order.amount;

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
        transition: "box-shadow 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {/* Status badge */}
      <span
        style={{
          flexShrink: 0,
          padding: "0.3rem 0.75rem",
          borderRadius: "999px",
          fontSize: "0.72rem",
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
        <p style={{ fontWeight: 700, margin: "0 0 0.15rem", fontSize: "0.95rem", color: "var(--hw-text)" }}>
          {order.name}
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            fontSize: "0.78rem",
            color: "var(--hw-text-secondary)",
            flexWrap: "wrap",
          }}
        >
          <span>{CURRENCY_LABELS[order.currency] ?? order.currency}</span>
          <span style={{ fontFamily: "monospace", direction: "ltr" }}>{order.number}</span>
          {/* Show the counterpart user */}
          {userType === "sender" && order.receiver && (
            <span>المستورد: {order.receiver.username}</span>
          )}
          {userType === "receiver" && order.sender && (
            <span>المورد: {order.sender.username}</span>
          )}
          {userType === "receiver" && !order.sender && order.status === "CANCELLED" && (
            <span style={{ color: "var(--hw-text-muted)" }}>لم يُحجز</span>
          )}
        </div>
      </div>

      {/* Amount + date */}
      <div style={{ flexShrink: 0, textAlign: "left" }}>
        <p
          style={{
            fontWeight: 800,
            fontSize: "1.1rem",
            color: "var(--hw-accent-solid)",
            margin: "0 0 0.25rem",
            direction: "ltr",
          }}
        >
          {amount.toLocaleString("en-US")}
        </p>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--hw-text-muted)",
            margin: 0,
            direction: "ltr",
            textAlign: "right",
          }}
        >
          {new Date(order.createdAt).toLocaleDateString("ar-EG")}
        </p>
      </div>
    </div>
  );
}

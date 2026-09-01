import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import SenderQueue from "../../../components/transfers/SenderQueue";
import ReceiverTracker from "../../../components/transfers/ReceiverTracker";
import SenderClaimedOrders from "../../../components/transfers/SenderClaimedOrders";

export const metadata = {
  title: "التحويلات | دفتر الحوالات",
  description: "إدارة طلبات التحويل في الوقت الفعلي",
};

export default async function TransfersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { type, id: userId } = session.user;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "var(--hw-accent)",
            margin: 0,
            direction: "rtl",
          }}
        >
          {type === "sender" ? "قائمة طلبات التحويل" : "إدارة طلبات التحويل"}
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--hw-text-muted)",
            marginTop: "0.25rem",
            direction: "rtl",
          }}
        >
          {type === "sender"
            ? "احجز الطلبات المتاحة وأتممها — تتحدث القائمة تلقائيًا"
            : "أرسل طلبات التحويل وتابع حالتها مباشرة"}
        </p>
      </div>

      {type === "sender" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <SenderQueue />
          <SenderClaimedOrders />
        </div>
      ) : (
        <ReceiverTracker userId={userId} />
      )}
    </div>
  );
}

import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import TransferHistory from "../../../../components/transfers/TransferHistory";

export const metadata = {
  title: "سجل التحويلات | دفتر الحوالات",
  description: "استعرض سجل طلبات التحويل السابقة مع خيارات البحث والتصفية",
};

export default async function TransferHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userType = session.user.type as "sender" | "receiver";

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
          سجل التحويلات
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--hw-text-muted)",
            marginTop: "0.25rem",
            direction: "rtl",
          }}
        >
          {userType === "sender"
            ? "جميع طلبات التحويل التي أتممتها"
            : "جميع طلباتك المكتملة والملغاة"}
        </p>
      </div>

      <TransferHistory userType={userType} />
    </div>
  );
}

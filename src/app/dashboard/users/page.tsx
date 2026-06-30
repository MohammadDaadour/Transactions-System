import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import CreateUserForm from "../../../components/CreateUserForm";
import UpdateUserForm from "../../../components/UpdateUserForm";
import UsersTable from "@/src/components/UsersTable";

export default async function UsersPage() {
    const session = await auth();
    if (!session || session.user?.role !== "Admin") redirect("/dashboard");

    // const activeSession = await db.session.findFirst({ where: { status: "OPEN" } });

    const userSelect: any = {
        id: true,
        username: true,
        role: true,
        type: true,
        phone: true,
        isActive: true,
        createdAt: true,
    };

    // if (activeSession?.id) {
        userSelect.balances = {
            select: {
                currency: true,
                balance: true,
            }
        };
    // }

    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: userSelect,
    });

    // تحويل البيانات وتعيين النوع كـ any[] ليتوافق مع الـ Props الخاصة بالمكون
    const serializedUsers = users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        type: u.type,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: u.createdAt,
        balances: (u.balances || []).map((b: any) => ({
            currency: b.currency,
            balance: b.balance.toNumber(),
        })),
    })) as any[];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">إدارة الحسابات</h2>
                <p className="text-hw-text-secondary mt-1">إضافة حساب جديد ومراجعة الحسابات الحالية.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                {/* Left: Create Account Form */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                        حساب جديد
                    </h3>
                    <div className="rounded-xl border border-hw-border bg-hw-surface p-6">
                        <CreateUserForm />
                    </div>
                </div>

                {/* Right: Existing Users Table */}
                <div className="xl:col-span-2 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                        الحسابات ({users.length})
                    </h3>
                    <UsersTable users={serializedUsers} />
                </div>
            </div>
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    const styles: Record<string, string> = {
        Admin: "bg-[var(--hw-role-admin-bg)] text-[var(--hw-role-admin-text)] border-[var(--hw-role-admin-border)]",
        Mod: "bg-[var(--hw-role-mod-bg)] text-[var(--hw-role-mod-text)] border-[var(--hw-role-mod-border)]",
        Member: "bg-hw-surface-alt/60 text-white border-hw-border-subtle/50",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-mono font-medium rounded border ${styles[role] ?? styles.Member}`}>
            {role === "Admin" ? "أدمن" : role === "Mod" ? "مدير" : "موزع"}
        </span>
    );
}
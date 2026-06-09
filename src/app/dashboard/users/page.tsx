import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import CreateUserForm from "../../../components/CreateUserForm";

export default async function UsersPage() {
    const session = await auth();
    if (!session || session.user?.role !== "Admin") redirect("/dashboard");

    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            username: true,
            role: true,
            type: true,
            phone: true,
            isActive: true,
            createdAt: true,
        },
    });

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
                    <div className="rounded-xl border border-hw-border bg-hw-surface overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-hw-border text-right">
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">اسم المستخدم</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الصلاحية</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">النوع</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الهاتف</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الحالة</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">تاريخ الاضافة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hw-border/60">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-hw-surface-alt/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-hw-text">{u.username}</td>
                                        <td className="px-4 py-3">
                                            <RoleBadge role={u.role} />
                                        </td>
                                        <td className="px-4 py-3 text-hw-text-secondary capitalize">{u.type == "receiver" ? "مستورد" : "مورد"}</td>
                                        <td className="px-4 py-3 text-hw-text-secondary font-mono text-xs">{u.phone}</td>
                                        <td className="px-4 py-3">
                                            {u.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-hw-accent">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-hw-accent inline-block" />
                                                    نشط
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-hw-text-muted">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-hw-text-faint inline-block" />
                                                    غير نشط
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-white text-xs font-mono">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-hw-text-muted text-sm">
                                            لا يوجد حسابات
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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

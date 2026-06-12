"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import UpdateUserForm from "./UpdateUserForm";
import { Role, UserType } from "../generated/prisma/enums";

type User = {
    id: string;
    username: string;
    role: Role;
    type: UserType;
    phone: string;
    isActive: boolean;
    createdAt: Date;
};

export default function UsersTable({ users }: { users: User[] }) {
    const router = useRouter();
    const [editingUser, setEditingUser] = useState<User | null>(null);

    return (
        <>
            <div className="rounded-xl border border-hw-border bg-hw-surface overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-hw-border text-right">
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">اسم المستخدم</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الصلاحية</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">النوع</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الهاتف</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الحالة</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">تاريخ الاضافة</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">تعديل</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hw-border/60">
                        {users.map((u) => (
                            <tr key={u.id} className="hover:bg-hw-surface-alt/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-hw-text">{u.username}</td>
                                <td className="px-4 py-3">
                                    <RoleBadge role={u.role} />
                                </td>
                                <td className="px-4 py-3 text-hw-text-secondary capitalize">
                                    {u.type === "receiver" ? "مستورد" : "مورد"}
                                </td>
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
                                    {new Date(u.createdAt).toLocaleDateString("ar-EG")}
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => setEditingUser(u)}
                                        className="text-white hover:text-hw-accent-hover focus:outline-none bg-hw-surface-alt/30 hover:bg-hw-surface-alt/50 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                                    >
                                        تعديل
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-hw-text-muted text-sm">
                                    لا يوجد حسابات
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setEditingUser(null); }}
                >
                    <div className="w-full max-w-md rounded-xl border border-hw-border bg-hw-surface p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-hw-text">
                                تعديل الحساب: <span className="font-mono text-hw-accent">{editingUser.username}</span>
                            </h3>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="text-hw-text-muted hover:text-hw-text transition-colors text-lg leading-none"
                            >
                                ✕
                            </button>
                        </div>
                        <UpdateUserForm
                            user={editingUser}
                            onSuccess={() => {
                                setEditingUser(null);
                                router.refresh();
                            }}
                        />
                    </div>
                </div>
            )}
        </>
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
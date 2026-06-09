import { auth, signOut } from "../../auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { username, role } = session.user;

    return (
        <div className="flex min-h-screen bg-hw-bg text-hw-text antialiased">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-hw-border bg-hw-surface p-6 flex flex-col justify-between">
                <div>
                    <div className="mb-8">
                        <h1 className="text-xl font-bold tracking-tight text-hw-accent">دفتر الحوالات</h1>
                        <p className="text-xs text-hw-text-secondary mt-1">اسم الحساب : <span className="font-semibold">{username}</span></p>
                        <span className="inline-block mt-2 px-2 py-0.5 text-xs font-mono font-medium rounded bg-hw-surface-alt text-white uppercase">
                            {role == "Admin" && role}
                        </span>
                    </div>

                    <nav className="space-y-1.5">
                        <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium rounded-md bg-hw-surface-alt text-white">
                            نظرة عامة
                        </Link>
                        {role !== "Member" && (
                            <Link href="/dashboard/transactions" className="block px-3 py-2 text-sm font-medium rounded-md text-hw-text-secondary hover:bg-hw-surface-alt hover:text-white transition">
                                إدارة الدفتر
                            </Link>
                        )}
                        {role === "Admin" && (
                            <Link href="/dashboard/audits" className="block px-3 py-2 text-sm font-medium rounded-md text-hw-text-secondary hover:bg-hw-surface-alt hover:text-white transition">
                                سجلات التدقيق
                            </Link>
                        )}
                        {role === "Admin" && (
                            <Link href="/dashboard/users" className="block px-3 py-2 text-sm font-medium rounded-md text-hw-text-secondary hover:bg-hw-surface-alt hover:text-white transition">
                                إدارة الحسابات
                            </Link>
                        )}
                    </nav>
                </div>

                {/* Logout Form Button */}
                <form
                    action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/login" });
                    }}
                >
                    <button type="submit" className="w-full text-left px-3 py-2 text-sm font-medium text-hw-danger bg-hw-danger-bg rounded-md transition">
                        تسجيل الخروج
                    </button>
                </form>
            </aside>

            {/* Main App Window Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
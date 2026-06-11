"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "../app/actions/logout";
import { usePathname } from "next/navigation";

type Props = {
    username: string;
    role: string;
};

export default function DashboardSidebar({
    username,
    role,
}: Props) {
    const [open, setOpen] = useState(false);

    const pathname = usePathname();

    const linkClass = (href: string) =>
        pathname === href
            ? "block px-3 py-2 text-sm font-medium rounded-md bg-hw-surface-alt text-white"
            : "block px-3 py-2 text-sm font-medium rounded-md text-hw-text-secondary hover:bg-hw-surface-alt hover:text-white transition";

    return (
        <>
            {/* ADDED: Mobile menu button */}
            <button
                onClick={() => setOpen(!open)}
                className="md:hidden fixed top-4 left-4 z-50 px-3 py-2 rounded bg-hw-surface border border-hw-border"
            >
                ☰
            </button>

            {/* ADDED: Mobile overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* CHANGED: Sidebar is hidden on mobile unless menu is open */}
            <div className="w-0 md:w-64"></div>
            <aside
                className={`
                    fixed 
                    top-0 left-0 md:right-0
                    h-screen
                    w-64
                    border-r border-hw-border
                    bg-hw-surface
                    p-6
                    flex flex-col justify-between
                    z-50
                    transition-transform duration-300
                    ${open
                        ? "translate-x-0"
                        : "-translate-x-full md:translate-x-0"
                    }
                `}
            >
                <div>
                    <div className="mb-8">
                        <h1 className="text-xl font-bold tracking-tight text-hw-accent">
                            دفتر الحوالات
                        </h1>

                        <p className="text-xs text-hw-text-secondary mt-1">
                            اسم الحساب :
                            <span className="font-semibold">
                                {username}
                            </span>
                        </p>

                        <span className="inline-block mt-2 px-2 py-0.5 text-xs font-mono font-medium rounded bg-hw-surface-alt text-white uppercase">
                            {role === "Admin" && role}
                        </span>
                    </div>

                    <nav className="space-y-1.5">
                        <Link
                            href="/dashboard"
                            className={linkClass("/dashboard")}
                            onClick={() => setOpen(false)}
                        >
                            نظرة عامة
                        </Link>

                        <Link
                            href="/dashboard/transactions"
                            className={linkClass("/dashboard/transactions")}
                            onClick={() => setOpen(false)}
                        >
                            إدارة الدفتر
                        </Link>

                        {/* {role === "Admin" && (
                            <Link
                                href="/dashboard/audits"
                                className={linkClass("/dashboard/audits")}
                                onClick={() => setOpen(false)}
                            >
                                سجلات التدقيق
                            </Link>
                        )} */}

                        {role === "Admin" && (
                            <Link
                                href="/dashboard/users"
                                className={linkClass("/dashboard/users")}
                                onClick={() => setOpen(false)}
                            >
                                إدارة الحسابات
                            </Link>
                        )}
                    </nav>
                </div>

                <form
                    action={async () => {
                        await logoutAction();
                    }}
                >
                    <button
                        type="submit"
                        className="w-full text-left px-3 py-2 text-sm font-medium text-hw-danger bg-hw-danger-bg rounded-md transition"
                    >
                        تسجيل الخروج
                    </button>
                </form>
            </aside>
        </>
    );
}
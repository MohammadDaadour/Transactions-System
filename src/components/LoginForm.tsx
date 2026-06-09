"use client";

import { useState } from "react";
import { loginAction } from "../app/actions/login";

export default function LoginForm() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const result = await loginAction(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4 rounded-md shadow-sm">

                {/* Username Field */}
                <div>
                    <label htmlFor="username" className="block text-xs font-medium text-hw-text-secondary mb-1">
                        Operator Username
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        placeholder="e.g., mohammad_admin"
                        className="w-full bg-hw-surface border border-hw-border rounded-md p-3 text-sm text-hw-text placeholder-hw-text-faint focus:border-hw-accent focus:outline-none transition font-mono"
                    />
                </div>

                {/* Password Field */}
                <div>
                    <label htmlFor="password" className="block text-xs font-medium text-hw-text-secondary mb-1">
                        Security Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full bg-hw-surface border border-hw-border rounded-md p-3 text-sm text-hw-text placeholder-hw-text-faint focus:border-hw-accent focus:outline-none transition font-mono"
                    />
                </div>
            </div>

            {/* Dynamic Error Banner */}
            {error && (
                <div className="rounded-md border border-hw-danger-border bg-hw-danger-bg p-3 text-xs font-medium text-hw-danger">
                    {error}
                </div>
            )}

            {/* Submission Dispatcher */}
            <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full justify-center rounded-md bg-hw-accent px-3 py-3 text-sm font-semibold text-hw-surface transition hover:bg-hw-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hw-accent disabled:bg-hw-disabled-bg disabled:text-hw-disabled-text"
                >
                    {loading ? "Authenticating Terminal..." : "Sign In to Ledger"}
                </button>
            </div>
        </form>
    );
}
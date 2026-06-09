import { auth } from "../../../auth";
import { db } from "../../../lib/db";
import { redirect } from "next/navigation";
import ManualTransactionForm from "../../../components/ManualTransactionForm";
import DynamicLedgerTable from "../../../components/DynamicLedgerTable";

export default async function TransactionsManagementPage() {
  const session = await auth();
  
  // 1. Role Gate: Block regular network members from reaching this route entirely
  if (!session || session.user?.role === "Member") {
    redirect("/dashboard");
  }

  const { role } = session.user;

  // 2. Fetch data required for administrative workflows
  const [activeUsers, rawTransactionHistory] = await Promise.all([
    db.user.findMany({ 
      where: { isActive: true },
      select: { id: true, username: true } 
    }),
    db.transaction.findMany({
      take: 100, // Show a larger window for dedicated desk operations
      orderBy: { createdAt: "desc" },
      include: { user: true, creator: true }
    })
  ]);

  // Highlight-start
  // Map Prisma Decimal types into JavaScript numbers to satisfy TransactionRow[]
  const transactionHistory = rawTransactionHistory.map((tx) => ({
    ...tx,
    amount: tx.amount.toNumber(),
  }));
  // Highlight-end

  return (
    <div className="space-y-6">
      {/* Page Context Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Ledger Desk Operations</h2>
          <p className="text-sm text-slate-400">
            Manual journal logging, entry validations, and system corrections.
          </p>
        </div>
        
        {/* Visual Badge Indicator */}
        <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 self-start">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-slate-300">
            Live Operator Mode
          </span>
        </div>
      </div>

      {/* Main Structural Layout Split */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
        
        {/* Left Side: Bulk Historical Transaction Journal Log Sheets */}
        <div className="xl:col-span-2 space-y-4Order">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Journal Posting Register (Last 100 Entries)
            </h3>
          </div>
          
          <DynamicLedgerTable 
            transactions={transactionHistory} 
            showReversalControl={role === "Admin"} 
          />
        </div>

        {/* Right Side: High-Velocity Manual Entry Ticket Sticky Panel */}
        <div className="space-y-4 xl:sticky xl:top-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Create Manual Entry Ticket
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <ManualTransactionForm 
              users={activeUsers} 
              allowOpeningBalance={role === "Admin"} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}
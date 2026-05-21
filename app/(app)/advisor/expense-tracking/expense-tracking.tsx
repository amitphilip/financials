"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfWeek } from "date-fns";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { HiddenNumber } from "@/components/ui/hidden-number";
import { cn } from "@/lib/utils";

import {
  deleteExpenseFile,
  loadExpenseTracking,
  saveExpenseTracking,
  type FileRecord,
  type Transaction,
} from "./actions";
import type { ProcessedFile } from "@/app/api/expense-tracking/process/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "weekly" | "monthly" | "yearly";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  mortgage: "Mortgage",
  rent: "Rent",
  utilities: "Utilities",
  groceries: "Groceries",
  dining: "Dining & Takeaways",
  transport: "Transport",
  shopping: "Shopping",
  entertainment: "Entertainment",
  healthcare: "Health & Medical",
  insurance: "Insurance",
  education: "Education",
  tax: "Tax & Levies",
  savings: "Savings",
  investments: "Investments",
  other: "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function getPeriodKey(dateStr: string, period: Period): string {
  try {
    const d = parseISO(dateStr);
    if (period === "yearly") return format(d, "yyyy");
    if (period === "monthly") return format(d, "yyyy-MM");
    const monday = startOfWeek(d, { weekStartsOn: 1 });
    return format(monday, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function formatPeriodLabel(key: string, period: Period): string {
  try {
    if (period === "yearly") return key;
    if (period === "monthly") {
      const d = parseISO(key + "-01");
      return format(d, "MMM yy");
    }
    const d = parseISO(key);
    return format(d, "d MMM");
  } catch {
    return key;
  }
}

function periodLabel(period: Period): string {
  return period === "weekly" ? "week" : period === "monthly" ? "month" : "year";
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExpenseTracking() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<Period>("monthly");
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted data on mount
  useEffect(() => {
    loadExpenseTracking().then((saved) => {
      if (!saved) return;
      setFiles(saved.files);
      setTransactions(saved.transactions);
    });
  }, []);

  // ─── Computed spend data ──────────────────────────────────────────────────

  // Real expenses: exclude transfers and income
  const expenseTransactions = transactions.filter(
    (t) => !t.isTransfer && t.category !== "income" && t.amount < 0
  );

  const totalSpend = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // By category (sorted descending)
  const byCategory = Object.entries(
    expenseTransactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  // By period (sorted chronologically)
  const periodMap = expenseTransactions.reduce<Record<string, number>>((acc, t) => {
    const key = getPeriodKey(t.date, period);
    if (key) acc[key] = (acc[key] || 0) + Math.abs(t.amount);
    return acc;
  }, {});

  const periodData = Object.entries(periodMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, amount]) => ({
      key,
      label: formatPeriodLabel(key, period),
      amount: Math.round(amount),
    }));

  const avgPerPeriod = periodData.length > 0 ? totalSpend / periodData.length : 0;

  // Covered date range
  const allDates = transactions
    .map((t) => t.date)
    .filter(Boolean)
    .sort();
  const coverFrom = allDates[0] ?? "";
  const coverTo = allDates[allDates.length - 1] ?? "";
  const coverLabel =
    coverFrom && coverTo
      ? `${format(parseISO(coverFrom), "d MMM yyyy")} – ${format(parseISO(coverTo), "d MMM yyyy")}`
      : "—";

  // ─── Upload handler ───────────────────────────────────────────────────────

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList).filter((f) =>
        /\.(csv|xlsx|xls)$/i.test(f.name)
      );
      if (incoming.length === 0) {
        toast.error("Only CSV and XLSX files are supported.");
        return;
      }

      // Check for duplicates
      const duplicates = incoming.filter((f) => files.some((r) => r.fileName === f.name));
      if (duplicates.length > 0) {
        toast.warning(
          `${duplicates.map((d) => d.name).join(", ")} already uploaded — skipping.`
        );
      }
      const toProcess = incoming.filter((f) => !files.some((r) => r.fileName === f.name));
      if (toProcess.length === 0) return;

      setUploadingFiles((prev) => [...prev, ...toProcess.map((f) => f.name)]);

      const results = await Promise.allSettled(
        toProcess.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/expense-tracking/process", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { error?: string }).error ?? "Upload failed");
          }
          return res.json() as Promise<ProcessedFile>;
        })
      );

      setUploadingFiles((prev) => prev.filter((n) => !toProcess.map((f) => f.name).includes(n)));

      const newFiles: FileRecord[] = [];
      const newTransactions: Transaction[] = [];

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          toast.error(`${toProcess[i].name}: ${r.reason?.message ?? "Failed"}`);
          return;
        }
        const data = r.value;
        newFiles.push({
          fileId: data.fileId,
          fileName: data.fileName,
          uploadedAt: new Date().toISOString(),
          rowCount: data.rowCount,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          accountInfo: data.accountInfo,
        });
        data.transactions.forEach((tx) => {
          newTransactions.push({
            ...tx,
            id: generateId(),
            sourceFileId: data.fileId,
          });
        });
        toast.success(`${data.fileName}: ${data.rowCount} transactions imported.`);
      });

      if (newFiles.length === 0) return;

      const updatedFiles = [...files, ...newFiles];
      const updatedTx = [...transactions, ...newTransactions];
      setFiles(updatedFiles);
      setTransactions(updatedTx);

      await saveExpenseTracking({ files: updatedFiles, transactions: updatedTx }).catch(() =>
        toast.error("Failed to save — please try again.")
      );
    },
    [files, transactions]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingFileId(fileId);
    try {
      await deleteExpenseFile(fileId);
      setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      setTransactions((prev) => prev.filter((t) => t.sourceFileId !== fileId));
      toast.success("File removed.");
    } catch {
      toast.error("Failed to remove file.");
    } finally {
      setDeletingFileId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasData = expenseTransactions.length > 0;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-6 space-y-5">
      {/* ── Upload card ── */}
      <div className="rounded-2xl border bg-card shadow-md overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Statements
          </p>
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            "mx-4 mb-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer",
            isDragOver
              ? "border-foreground bg-muted/30"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/10"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2 py-7 pointer-events-none">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Drop CSV or XLSX files here</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bank statements from any NZ bank
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
        />

        {/* Uploading progress */}
        {uploadingFiles.length > 0 && (
          <div className="px-4 pb-3 space-y-2">
            {uploadingFiles.map((name) => (
              <div key={name} className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">Uploading and categorising…</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="px-4 pb-4 space-y-2">
            {files.map((f) => (
              <div
                key={f.fileId}
                className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{f.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.rowCount} transactions
                    {f.dateFrom && f.dateTo && (
                      <>
                        {" · "}
                        {format(parseISO(f.dateFrom), "d MMM yyyy")}
                        {" – "}
                        {format(parseISO(f.dateTo), "d MMM yyyy")}
                      </>
                    )}
                  </p>
                  {f.accountInfo && (
                    <p className="text-xs text-muted-foreground truncate">{f.accountInfo}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(f.fileId);
                  }}
                  disabled={deletingFileId === f.fileId}
                  className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  aria-label="Remove file"
                >
                  {deletingFileId === f.fileId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── No data placeholder ── */}
      {!hasData && files.length === 0 && uploadingFiles.length === 0 && (
        <div className="rounded-2xl border bg-card shadow-md px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Upload a bank statement to see your spend breakdown.
          </p>
        </div>
      )}

      {/* ── Data views (only show once we have expenses) ── */}
      {hasData && (
        <>
          {/* Period toggle */}
          <div className="flex justify-center">
            <div className="flex rounded-xl border bg-card shadow-sm overflow-hidden">
              {(["weekly", "monthly", "yearly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-2 text-xs font-medium capitalize transition-colors",
                    period === p
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border bg-card shadow-md px-3 py-3">
              <p className="text-xs text-muted-foreground">Total spend</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                <span className="text-xs font-normal mr-0.5">$</span>
                <HiddenNumber value={Math.round(totalSpend)} />
              </p>
            </div>
            <div className="rounded-2xl border bg-card shadow-md px-3 py-3">
              <p className="text-xs text-muted-foreground">Avg per {periodLabel(period)}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                <span className="text-xs font-normal mr-0.5">$</span>
                <HiddenNumber value={Math.round(avgPerPeriod)} />
              </p>
            </div>
            <div className="rounded-2xl border bg-card shadow-md px-3 py-3">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {expenseTransactions.length}
              </p>
            </div>
          </div>

          {/* Date range badge */}
          {coverFrom && (
            <p className="text-center text-xs text-muted-foreground">{coverLabel}</p>
          )}

          {/* ── Category breakdown ── */}
          <div className="rounded-2xl border bg-card shadow-md overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Where your money goes
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transfers and income excluded
              </p>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {byCategory.map(([cat, amount], i) => {
                const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
                const colorVar = `var(--chart-${(i % 5) + 1})`;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ background: colorVar }}
                      />
                      <span className="text-xs flex-1 font-medium">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-xs tabular-nums font-semibold w-20 text-right">
                        <span className="text-xs font-normal">$</span>
                        <HiddenNumber value={Math.round(amount)} />
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: colorVar }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Period trend chart ── */}
          {periodData.length > 1 && (
            <div className="rounded-2xl border bg-card shadow-md overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {period.charAt(0).toUpperCase() + period.slice(1)} trend
                </p>
              </div>
              <div className="px-1 pb-4">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={periodData} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval={periodData.length > 12 ? Math.floor(periodData.length / 12) : 0}
                    />
                    <YAxis
                      width={52}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", radius: 4 }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-xl border bg-card px-3 py-2 shadow-md text-xs">
                            <p className="font-medium mb-1">{label}</p>
                            <p className="tabular-nums">
                              {fmtCurrency(payload[0]?.value as number)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Transfer summary (informational) ── */}
          {transactions.some((t) => t.isTransfer) && (
            <div className="rounded-2xl border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {transactions.filter((t) => t.isTransfer).length} account-to-account transfers
                </span>{" "}
                detected and excluded from spend ({" "}
                {fmtCurrency(
                  transactions
                    .filter((t) => t.isTransfer && t.amount < 0)
                    .reduce((s, t) => s + Math.abs(t.amount), 0)
                )}{" "}
                total ).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

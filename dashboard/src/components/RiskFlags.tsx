import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Account, RiskFlagItem } from "../types";

function money(n: number, ccy: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(n);
}

function when(d: string) {
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(id?: string) {
  if (!id) return "";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function parseReasons(reasonsJson?: string) {
  if (!reasonsJson) return [];
  try {
    const v = JSON.parse(reasonsJson);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [reasonsJson];
  }
}

export function RiskFlags({
  refreshToken,
  accounts,
  onCountChange,
}: {
  refreshToken: number;
  accounts: Account[];
  onCountChange?: (count: number) => void;
}) {
  const [minScore, setMinScore] = useState(1);
  const [items, setItems] = useState<RiskFlagItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const accountById = useMemo(() => {
    const m = new Map<string, Account>();
    for (const a of accounts) m.set(a.id, a);
    return m;
  }, [accounts]);

  const nameFor = useCallback(
    (id: string) => {
      const a = accountById.get(id);
      return a ? a.name : shortId(id);
    },
    [accountById]
  );

  const load = useCallback(async () => {
    try {
      setErr(null);
      setBusy(true);
      const data = await api<RiskFlagItem[]>(`/risk/flags?minScore=${minScore}`);
      setItems(data);
      onCountChange?.(data.length);
    } catch (e) {
      if (e instanceof Error) setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, [minScore, onCountChange]);

  useEffect(() => {
    load();
  }, [refreshToken, load]);

  const header = `Showing transfers with riskScore ≥ ${minScore}`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Risk Flags</div>
          <div className="text-sm text-slate-500">{header}</div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="grid gap-1 sm:w-[140px]">
            <span className="text-sm font-medium text-slate-700">minScore</span>
            <input
              type="number"
              min={0}
              value={minScore}
              onChange={(e) => { 
                const v = Number(e.target.value);
                setMinScore(Number.isFinite(v) ? Math.max(0, v) : 1);
                }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>

          {/* <button
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            onClick={load}
            disabled={busy}
          >
            {busy ? "Loading…" : "Refresh"}
          </button> */}
        </div>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      {/* List */}
      <div className="space-y-3">
        {items.map((x) => {
          const riskLevel = (x.riskLevel ?? "").toLowerCase();
          const pill =
            riskLevel === "high"
              ? "border-red-200 bg-red-50 text-red-800"
              : riskLevel === "medium"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800";

          const reasons = parseReasons(x.reasonsJson);

          return (
            <div
              key={x.transferId}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              {/* Top row */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${pill}`}>
                    {x.riskLevel} ({x.riskScore})
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {money(x.amount, x.currency)}
                  </span>

                  <span className="text-xs text-slate-400">•</span>

                  <span className="text-sm text-slate-700">{x.status}</span>
                </div>

                <div className="text-xs text-slate-500">{when(x.createdAt)}</div>
              </div>

              {/* Reasons */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Reasons</span>
                {reasons.length ? (
                  reasons.map((r, idx) => (
                    <span
                      key={`${x.transferId}-r-${idx}`}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                    >
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">none</span>
                )}
              </div>

              {/* From/To (names if available) */}
              <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                <div className="min-w-0">
                  <span className="text-slate-500">From:</span>{" "}
                  <span className="truncate font-medium text-slate-800">
                    {nameFor(x.fromAccountId)}
                  </span>{" "}
                  <span className="font-mono text-[11px] text-slate-500">
                    ({shortId(x.fromAccountId)})
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-slate-500">To:</span>{" "}
                  <span className="truncate font-medium text-slate-800">
                    {nameFor(x.toAccountId)}
                  </span>{" "}
                  <span className="font-mono text-[11px] text-slate-500">
                    ({shortId(x.toAccountId)})
                  </span>
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Transfer{" "}
                <span className="font-mono text-[11px]">{shortId(x.transferId)}</span>
              </div>
            </div>
          );
        })}

        {!busy && items.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            No flagged transfers.
          </div>
        ) : null}
      </div>
    </div>
  );
}

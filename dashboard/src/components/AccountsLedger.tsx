// Loads accounts once, then fetches ledger entries for the selected account.
// Keeps loading states separate so account list and ledger can update independently.

import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Account, LedgerEntry } from "../types";

function money(n: number, ccy: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ccy,
  }).format(n);
}

function formatWhen(d: string) {
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(id: string) {
  if (!id) return "";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function AccountsLedger({
  refreshToken,
  onAccountsLoaded,
  onTransferSelect
}: {
  refreshToken: number;
  onAccountsLoaded?: (accounts: Account[]) => void;
  onTransferSelect?: (transferId: string) => void;

}) {

  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);


  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId]
  );

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoadingAccounts(true);
        const a = await api<Account[]>("/accounts");
        setAccounts(a);
        onAccountsLoaded?.(a);
        setSelectedId((prev) => prev || a[0]?.id || "");
      } catch (e) {
        if (e instanceof Error) setErr(e.message ?? String(e));
      } finally {
        setLoadingAccounts(false);
      }
    })();
  }, [refreshToken, onAccountsLoaded]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        setErr(null);
        setLoadingLedger(true);
        setVisibleCount(PAGE_SIZE);
        const rows = await api<LedgerEntry[]>(`/accounts/${selectedId}/ledger`);
        setLedger(rows);
      } catch (e) {
        if (e instanceof Error) setErr(e.message ?? String(e));
      } finally {
        setLoadingLedger(false);
      }
    })();
  }, [selectedId, refreshToken]);

  const visibleLedger = useMemo(
    () => ledger.slice(0, visibleCount),
    [ledger, visibleCount]
  );


  return (
    <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
      {/* Accounts */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold text-slate-900">Accounts</div>
          {loadingAccounts ? (
            <span className="text-xs text-slate-500">Loading…</span>
          ) : null}
        </div>

        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        <div className="space-y-2">
          {accounts.map((a) => {
            const active = a.id === selectedId;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={[
                  "w-full rounded-xl border px-3 py-3 text-left",
                  "transition hover:bg-slate-50",
                  active
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {a.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {a.type} • {money(a.balance, a.currency)}
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {a.currency}
                  </span>
                </div>

                <div className="mt-2 font-mono text-[11px] text-slate-500">
                  {shortId(a.id)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ledger */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold text-slate-900">
            Ledger{selected ? ` — ${selected.name}` : ""}
          </div>
          {loadingLedger ? (
            <span className="text-xs text-slate-500">Loading…</span>
          ) : null}
        </div>

        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Balance</th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Transfer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleLedger.map((e) => {
                const ccy = selected?.currency ?? "CAD";
                const isCredit = e.type.toUpperCase().includes("CREDIT");
                return (
                  <tr key={e.id} className="bg-white">
                    <td className="px-3 py-2">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          isCredit
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-800",
                        ].join(" ")}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="px-3 py-2">{money(e.amount, ccy)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {money(e.balance, ccy)}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {formatWhen(e.createdAt)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                      {/* {shortId(e.transferId)} */}
                      <button
                        className="font-mono text-xs text-slate-700 hover:underline"
                        onClick={() => onTransferSelect?.(e.transferId)}
                        title={e.transferId}
                      >
                        {e.transferId.slice(0, 8)}…{e.transferId.slice(-4)}
                      </button>

                    </td>
                  </tr>
                );
              })}

              {ledger.length === 0 && !loadingLedger ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                    No ledger entries yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {!loadingLedger && ledger.length > visibleCount ? (
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2">
              <button
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                onClick={() =>
                  setVisibleCount((v) => Math.min(v + PAGE_SIZE, ledger.length))
                }
              >
                Load more ({Math.min(PAGE_SIZE, ledger.length - visibleCount)} more)
              </button>
            </div>
          ) : !loadingLedger && ledger.length > 0 ? (
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
              End of history
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}

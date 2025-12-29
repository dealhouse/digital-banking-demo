import { useState } from "react";
import type { Account } from "../types";
import { searchTransfersByPrefix, type TransferSummary } from "../api";
import { Alert, GhostButton, Label, TextInput } from "./UI";

function money(n: number, ccy: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(n);
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function TransferSearchByPrefix({
  token,
  onSelectTransferId,
}: {
  token: string;
  accounts: Account[];
  onSelectTransferId?: (id: string) => void;
}) {
  const [prefix, setPrefix] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<TransferSummary[]>([]);

  async function search() {
    const p = prefix.trim();
    if (p.length < 6) {
      setErr("Enter at least 6 characters of the transfer ID.");
      setResults([]);
      return;
    }

    setBusy(true);
    setErr(null);
    setResults([]);

    try {
      const data = await searchTransfersByPrefix(token, p);
      setResults(data);
      if (!data.length) {
        setErr("No transfers found for that prefix.");
      }
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1">
          <Label>Transfer ID prefix</Label>
          <TextInput
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="e.g. fec8e881"
          />
        </label>

        <GhostButton onClick={search} disabled={busy || !prefix.trim()}>
          {busy ? "Searching…" : "Search"}
        </GhostButton>
      </div>

      {err ? <Alert variant="error">{err}</Alert> : null}

      {results.length > 0 && (
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          {results.map((t) => (
            <button
              key={t.transferId}
              onClick={() => onSelectTransferId?.(t.transferId)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold">
                  {shortId(t.transferId)}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(t.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-600">
                <span>{money(t.amount, t.currency)}</span>
                <span>{t.status}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

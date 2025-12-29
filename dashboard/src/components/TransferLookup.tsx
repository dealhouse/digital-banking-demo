import { useEffect, useMemo, useState } from "react";
import type { Account } from "../types";
import { Alert, GhostButton, Label, TextInput } from "./UI";
import { getTransferDetails } from "../api";

type TransferDetails = {
  transferId: string;
  status: string;
  amount: number;
  currency: string;
  memo?: string;
  fromAccountId: string;
  toAccountId: string;
  createdAt: string;
  riskScore: number | null;
  riskLevel: string | null;
  riskReasons?: string[];
};

function money(n: number, ccy: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(n);
}
function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function TransferLookup({
  token,
  accounts,
  initialId,
}: {
  token: string;
  accounts: Account[];
  initialId?: string | null;
}) {
  const [transferId, setTransferId] = useState(initialId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<TransferDetails | null>(null);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.id, a.name);
    return m;
  }, [accounts]);

  async function fetchTransfer(idRaw: string) {
    const id = idRaw.trim();
    if (!id) return;

    setBusy(true);
    setErr(null);
    setData(null);
    try {
      const resp = await getTransferDetails(token, id);
      setData(resp);
    } catch (e) {
      setErr((e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  }


  async function handleLookup() {
    await fetchTransfer(transferId);
  }

  // Auto-load when initialId changes (user clicked a ledger row)
  useEffect(() => {
    if (!initialId) return;
    if (initialId === transferId) return;

    setTransferId(initialId);
    fetchTransfer(initialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  const fromName = data
    ? nameById.get(data.fromAccountId) ?? shortId(data.fromAccountId)
    : null;
  const toName = data
    ? nameById.get(data.toAccountId) ?? shortId(data.toAccountId)
    : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1">
          <Label>Transfer ID</Label>
          <TextInput
            value={transferId}
            onChange={(e) => setTransferId(e.target.value)}
            placeholder="e.g. fec8e881-…"
          />
        </label>

        <GhostButton
          onClick={handleLookup}
          disabled={busy || !transferId.trim()}
        >
          {busy ? "Looking up…" : "Lookup"}
        </GhostButton>
      </div>

      {err ? <Alert variant="error">{err}</Alert> : null}

      {data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Transfer {shortId(data.transferId)}
            </div>
            <div className="text-xs text-slate-500">
              {new Date(data.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Amount</div>
              <div className="font-medium">
                {money(data.amount, data.currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Status</div>
              <div className="font-medium">{data.status}</div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">Route</div>
              <div className="font-medium">
                {fromName} <span className="text-slate-400">→</span> {toName}
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-500">
                {data.fromAccountId} → {data.toAccountId}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">Risk</div>
              <div className="font-medium">
                {data.riskLevel ?? "—"}{" "}
                {data.riskScore != null ? `(${data.riskScore})` : ""}
              </div>
              {data.riskReasons?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.riskReasons.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                    >
                      {r.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {data.memo ? (
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">Memo</div>
                <div className="font-medium">{data.memo}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

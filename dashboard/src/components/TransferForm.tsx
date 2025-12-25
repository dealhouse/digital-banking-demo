import { useEffect, useMemo, useState } from "react";
import { api, newIdempotencyKey } from "../api";
import type { Account, TransferRequest, TransferResponse } from "../types";

function money(n: number, ccy: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(n);
}

function shortId(id?: string) {
  if (!id) return "";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function TransferForm({
  token,
  accounts,
  onTransferSuccess,
}: {
  token: string;
  accounts: Account[];
  onTransferSuccess: () => void;
}) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState<string>("10");
  const [memo, setMemo] = useState("test");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [last, setLast] = useState<TransferResponse | null>(null);

  useEffect(() => {
    if (!accounts.length) return;

    setFromId((prev) => prev || accounts[0]?.id || "");
    setToId((prev) => {
      if (prev) return prev;
      const second = accounts[1]?.id;
      return second && second !== accounts[0]?.id ? second : "";
    });
  }, [accounts]);

  const from = useMemo(() => accounts.find((a) => a.id === fromId) ?? null, [accounts, fromId]);
  const to = useMemo(() => accounts.find((a) => a.id === toId) ?? null, [accounts, toId]);

  const currency = from?.currency ?? "CAD";

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amount.trim() !== "" && amountNum > 0;
  const sameAccount = fromId !== "" && fromId === toId;

  const formError =
    !fromId ? "Choose a source account." :
    !toId ? "Choose a destination account." :
    sameAccount ? "From and To must be different accounts." :
    !amountValid ? "Amount must be a positive number." :
    null;

  const canSubmit = !formError && !busy;

  async function submit() {
    if (!canSubmit) return;

    try {
      setErr(null);
      setLast(null);
      setBusy(true);

      const req: TransferRequest = {
        fromAccountId: fromId,
        toAccountId: toId,
        amount: amountNum,
        currency,
        memo: memo.trim(),
      };

      const idKey = newIdempotencyKey();

      const resp = await api<TransferResponse>(
        "/transfers",
        { method: "POST", body: req, headers: { "Idempotency-Key": idKey } },
        token
      );

      setLast(resp);
      onTransferSuccess();
    } catch (e) {
      if (e instanceof Error) setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  const riskTone =
    last?.riskLevel?.toLowerCase() === "high"
      ? "border-red-200 bg-red-50 text-red-800"
      : last?.riskLevel?.toLowerCase() === "medium"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      {/* From/To */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">From</span>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Select…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type}) — {money(a.balance, a.currency)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">To</span>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Select…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type}) — {money(a.balance, a.currency)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Amount/Memo */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Amount ({currency})</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="0.00"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Memo</span>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Optional"
          />
        </label>
      </div>

      {/* Preview strip */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <span className="font-medium">Preview:</span>{" "}
        {from ? from.name : "—"} → {to ? to.name : "—"}{" "}
        <span className="text-slate-400">•</span>{" "}
        {amountValid ? money(amountNum, currency) : "—"}
        {memo.trim() ? (
          <>
            {" "}
            <span className="text-slate-400">•</span>{" "}
            <span className="italic">“{memo.trim()}”</span>
          </>
        ) : null}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-h-[20px] text-sm text-red-700">
          {formError ? formError : ""}
        </div>

        <button
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={!canSubmit}
          onClick={submit}
        >
          {busy ? "Sending…" : "Send transfer"}
        </button>
      </div>

      {/* Result card */}
      {last ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900">Transfer created</div>
            <div className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskTone}`}>
              {last.riskLevel} ({last.riskScore})
            </div>
          </div>

          <div className="grid gap-1 text-sm text-slate-700">
            <div>
              <span className="text-slate-500">Transfer:</span>{" "}
              <span className="font-mono text-[12px]">{shortId(last.transferId)}</span>
            </div>
            <div>
              <span className="text-slate-500">Status:</span> {last.status}
            </div>
            <div>
              <span className="text-slate-500">Reasons:</span>{" "}
              {last.riskReasons?.length ? last.riskReasons.join(", ") : "none"}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

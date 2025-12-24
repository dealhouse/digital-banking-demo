import { useMemo, useState } from "react";
import { api, newIdempotencyKey } from "../api";
import type { Account, TransferRequest, TransferResponse } from "../types";


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
  const [amount, setAmount] = useState(10);
  const [memo, setMemo] = useState("test");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [last, setLast] = useState<TransferResponse | null>(null);

  const currency = useMemo(() => accounts.find(a => a.id === fromId)?.currency ?? "CAD", [accounts, fromId]);

  const canSubmit =
    fromId &&
    toId &&
    fromId !== toId &&
    amount > 0;

  async function submit() {
    try {
      setErr(null);
      setBusy(true);

      const req: TransferRequest = {
        fromAccountId: fromId,
        toAccountId: toId,
        amount: Number(amount),
        currency,
        memo,
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
        if (e instanceof Error) {
          setErr(e.message ?? String(e));
        }
      } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Create Transfer</h3>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          From
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Select…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type}) — {a.balance} {a.currency}
              </option>
            ))}
          </select>
        </label>

        <label>
          To
          <select value={toId} onChange={(e) => setToId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Select…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </label>

        <label>
          Amount ({currency})
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Memo
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <button disabled={!canSubmit || busy} onClick={submit}>
          {busy ? "Sending…" : "Send transfer"}
        </button>

        {last ? (
          <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
            <div><strong>Transfer:</strong> {last.transferId}</div>
            <div><strong>Status:</strong> {last.status}</div>
            <div><strong>Risk:</strong> {last.riskLevel} ({last.riskScore})</div>
            <div><strong>Reasons:</strong> {last.riskReasons?.join(", ") || "none"}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

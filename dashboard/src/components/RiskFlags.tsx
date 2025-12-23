import { useCallback,useEffect, useState } from "react";
import { api } from "../api";
import type { RiskFlagItem } from "../types";

export function RiskFlags({ refreshToken }: { refreshToken: number }) {
  const [minScore, setMinScore] = useState(1);
  const [items, setItems] = useState<RiskFlagItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      setBusy(true);
      const data = await api<RiskFlagItem[]>(`/risk/flags?minScore=${minScore}`);
      setItems(data);
    } catch (e) {
        if (e instanceof Error) {
          setErr(e.message ?? String(e));
        }
      } finally {
      setBusy(false);
    }
  }, [minScore]);

  useEffect(() => {
    load();
  }, [refreshToken, load]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Risk Flags</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>minScore</span>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            style={{ width: 90 }}
          />
          <button onClick={load} disabled={busy}>
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {items.map((x) => (
          <div key={x.transferId} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{x.riskLevel} ({x.riskScore})</strong>
              <span style={{ opacity: 0.8 }}>{x.amount} {x.currency} • {x.status}</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {new Date(x.createdAt).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              reasonsJson: {x.reasonsJson || "[]"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              from {x.fromAccountId} → to {x.toAccountId}
            </div>
          </div>
        ))}
        {!busy && items.length === 0 ? <p style={{ opacity: 0.7 }}>No flagged transfers.</p> : null}
      </div>
    </div>
  );
}

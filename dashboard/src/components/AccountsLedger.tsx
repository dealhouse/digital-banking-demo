import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Account, LedgerEntry } from "../types";

function money(n: number, ccy: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(n);
}

export function AccountsLedger({
  refreshToken,
  onAccountsLoaded,
}: {
  refreshToken: number;
  onAccountsLoaded?: (accounts: Account[]) => void;
}) {
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
        if (e instanceof Error) {
          setErr(e.message ?? String(e));
        }
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
        const rows = await api<LedgerEntry[]>(`/accounts/${selectedId}/ledger`);
        setLedger(rows);
      } catch (e) {
        if (e instanceof Error) {
          setErr(e.message ?? String(e));
        }
      } finally {
        setLoadingLedger(false);
      }
    })();
  }, [selectedId, refreshToken]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Accounts</h3>
        {loadingAccounts ? <p>Loading…</p> : null}
        {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

        <div style={{ display: "grid", gap: 8 }}>
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              style={{
                textAlign: "left",
                padding: 10,
                borderRadius: 10,
                border: a.id === selectedId ? "2px solid #333" : "1px solid #ddd",
                background: "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700 }}>{a.name}</div>
              <div style={{ opacity: 0.8 }}>
                {a.type} • {money(a.balance, a.currency)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{a.id}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>
          Ledger {selected ? `— ${selected.name}` : ""}
        </h3>

        {loadingLedger ? <p>Loading…</p> : null}

        <div style={{ display: "grid", gap: 8 }}>
          {ledger.map((e) => (
            <div
              key={e.id}
              style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{e.type}</strong>
                <span>
                  {money(e.amount, selected?.currency ?? "CAD")} • bal {money(e.balance, selected?.currency ?? "CAD")}
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {new Date(e.createdAt).toLocaleString()} • transfer {e.transferId}
              </div>
            </div>
          ))}
          {ledger.length === 0 && !loadingLedger ? (
            <p style={{ opacity: 0.7 }}>No ledger entries yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

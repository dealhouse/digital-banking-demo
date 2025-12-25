import { useMemo, useState } from "react";
import { protectedPing, scoreRisk, type RiskScoreResponse } from "../api";
import { RiskResultCard } from "../components/RiskResultCard";
import { RiskFlags } from "../components/RiskFlags";
import { AccountsLedger } from "../components/AccountsLedger";
import { TransferForm } from "../components/TransferForm";
import { TransferSearchByPrefix } from "../components/TransferSearchByPrefix";
import { TransferLookup } from "../components/TransferLookup"; // your existing details component
import type { Account } from "../types";
import { Alert, Card, GhostButton, Label, PrimaryButton, TextInput } from "../components/UI";

type Session = { token: string; email: string };
type Tab = "transfers" | "risk" | "tools";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-2 text-sm font-medium",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function DashboardPage({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("transfers");

  // Auth ping
  const [pingResult, setPingResult] = useState(null);
  const [pingError, setPingError] = useState<string | null>(null);

  async function runPing() {
    setPingError(null);
    setPingResult(null);
    try {
      const data = await protectedPing(session.token);
      setPingResult(data);
    } catch (e) {
      setPingError((e as Error).message);
    }
  }

  // Risk sandbox
  const [amount, setAmount] = useState("600");
  const [currency, setCurrency] = useState("CAD");
  const [riskResult, setRiskResult] = useState<RiskScoreResponse | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskCount, setRiskCount] = useState<number | null>(null);

  const amountNum = Number(amount);
  const currencyClean = currency.trim().toUpperCase();
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const currencyValid = /^[A-Z]{3}$/.test(currencyClean);

  const formError =
    !amountValid
      ? "Amount must be a positive number."
      : !currencyValid
      ? "Currency must be a 3-letter code (e.g., CAD, USD)."
      : null;

  async function onScoreRisk() {
    setRiskError(null);
    setRiskResult(null);
    setRiskLoading(true);
    try {
      const data = await scoreRisk(session.token, amountNum, currencyClean);
      setRiskResult(data);
    } catch (e) {
      setRiskError((e as Error).message);
    } finally {
      setRiskLoading(false);
    }
  }

  // Accounts + refresh
const [accountsRefreshToken, setAccountsRefreshToken] = useState(0);
const [riskRefreshToken, setRiskRefreshToken] = useState(0);
const [accounts, setAccounts] = useState<Account[]>([]);

const [lastAccountsAt, setLastAccountsAt] = useState<Date | null>(null);
const [lastRiskAt, setLastRiskAt] = useState<Date | null>(null);

const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);


function bumpAccounts() {
  setAccountsRefreshToken((x) => x + 1);
  setLastAccountsAt(new Date());
}
function bumpRisk() {
  setRiskRefreshToken((x) => x + 1);
  setLastRiskAt(new Date());
}
function bumpAll() {
  bumpAccounts();
  bumpRisk();
}


  const tabSubtitle = useMemo(() => {
    if (tab === "transfers") return "Create transfers and verify ledger updates";
    if (tab === "risk") return "Review flagged transfers and test risk scoring";
    return "Developer utilities (token + diagnostics)";
  }, [tab]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">Digital Banking Demo</div>
              <h1 className="text-lg font-semibold text-slate-900">
                Dashboard
              </h1>
              <div className="mt-1 text-sm text-slate-500">{tabSubtitle}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">
                Logged in as <span className="font-medium">{session.email}</span>
              </div>
              <GhostButton onClick={onLogout}>Logout</GhostButton>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            <TabButton active={tab === "transfers"} onClick={() => setTab("transfers")}>
              Transfers
            </TabButton>
            <TabButton active={tab === "risk"} onClick={() => setTab("risk")}>
  <span className="flex items-center gap-2">
    Risk & Compliance
    {riskCount !== null ? (
      <span
        className={[
          "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
          riskCount > 0 ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700",
        ].join(" ")}
        title="Number of flagged transfers currently shown"
      >
        {riskCount}
      </span>
    ) : null}
  </span>
</TabButton>

            <TabButton active={tab === "tools"} onClick={() => setTab("tools")}>
              Tools
            </TabButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "transfers" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card title="Create Transfer" subtitle="Idempotency protected">
                <TransferForm
                  token={session.token}
                  accounts={accounts}
                  onTransferSuccess={bumpAll}
                />
              </Card>
            </div>

            <div className="space-y-6">
              <Card title="Accounts & Ledger" subtitle="Balances update after transfers">
                <AccountsLedger
                  refreshToken={accountsRefreshToken}
                  onAccountsLoaded={setAccounts}
                  onTransferSelect={setSelectedTransferId}
                />
              </Card>
              {selectedTransferId ? (
  <Card title="Transfer details" subtitle="Selected from ledger">
    <TransferLookup token={session.token} accounts={accounts} initialId={selectedTransferId} />
  </Card>
) : (
  <Card title="Transfer details" subtitle="Select a transfer in the ledger">
    <div className="text-sm text-slate-600">Click a transfer ID in the ledger to inspect it here.</div>
  </Card>
)}

            </div>
          </div>
        ) : null}

        {tab === "risk" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card title="Risk Flags" subtitle="Latest assessments">
                <RiskFlags 
                refreshToken={riskRefreshToken} 
                accounts={accounts} 
                onCountChange={setRiskCount}
                />
              </Card>
            </div>

            <div className="space-y-6">
              <Card title="Risk Sandbox" subtitle="Score an arbitrary transfer amount">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <Label>Amount</Label>
                      <TextInput
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        placeholder="600"
                      />
                    </label>

                    <label className="grid gap-1">
                      <Label>Currency</Label>
                      <TextInput
                        value={currency}
                        onChange={(e) =>
                          setCurrency(e.target.value.toUpperCase().slice(0, 3))
                        }
                        placeholder="CAD"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <span className="font-medium">Preview:</span>{" "}
                    {amountValid
                      ? new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: currencyClean,
                        }).format(amountNum)
                      : "—"}{" "}
                    <span className="text-slate-400">•</span> currency{" "}
                    <span className="font-mono">{currencyClean || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-h-[20px] text-sm text-red-700">
                      {formError ? formError : ""}
                    </div>

                    <PrimaryButton
                      onClick={onScoreRisk}
                      disabled={riskLoading || !!formError}
                    >
                      {riskLoading ? "Scoring…" : "Score risk"}
                    </PrimaryButton>
                  </div>

                  <div className="space-y-2">
                    {riskError && <Alert variant="error">{riskError}</Alert>}
                    {riskResult && <RiskResultCard result={riskResult} />}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "tools" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Auth Ping" subtitle="Quick token check">
              <div className="space-y-3">
                <GhostButton onClick={runPing}>Test Auth Ping</GhostButton>
                {pingError && <Alert variant="error">{pingError}</Alert>}
                {pingResult && <Alert>{JSON.stringify(pingResult, null, 2)}</Alert>}
              </div>
            </Card>
            <Card title="Data refresh" subtitle="Manual refresh and data freshness">
  <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <GhostButton onClick={() => bumpAccounts()}>Refresh accounts/ledger</GhostButton>
      <GhostButton onClick={() => bumpRisk()}>Refresh risk flags</GhostButton>
      <PrimaryButton onClick={() => bumpAll()}>Refresh all</PrimaryButton>
    </div>

    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
      <div>
        <span className="text-slate-500">Accounts/Ledger:</span>{" "}
        <span className="font-mono">{lastAccountsAt ? lastAccountsAt.toLocaleTimeString() : "—"}</span>
      </div>
      <div>
        <span className="text-slate-500">Risk Flags:</span>{" "}
        <span className="font-mono">{lastRiskAt ? lastRiskAt.toLocaleTimeString() : "—"}</span>
      </div>
    </div>
  </div>
</Card>
    <Card
      title="Transfer search"
      subtitle="Search transfers by ID prefix"
    >
      <TransferSearchByPrefix
        token={session.token}
        accounts={accounts}
        onSelectTransferId={setSelectedTransferId}
      />
    </Card>

    <Card
      title="Transfer details"
      subtitle={
        selectedTransferId
          ? "Selected from search or ledger"
          : "Search or click a transfer to inspect details"
      }
    >
      <TransferLookup
        token={session.token}
        accounts={accounts}
        initialId={selectedTransferId ?? undefined}
      />
    </Card>


            <Card title="Notes" subtitle="What this tab is for">
              <div className="text-sm text-slate-600 space-y-2">
                <p>Keep developer-only utilities here (token checks, echo endpoints, raw JSON).</p>
                <p>This keeps the main demo tabs clean for interview walkthroughs.</p>
              </div>
            </Card>
          </div>
        ) : null}

        <p className="mt-6 text-sm text-slate-500">
          Next: Cleaner UX, README “Run locally”, idempotency proof toggle.
        </p>
      </main>
    </div>
  );
}

import { useState } from 'react'
import LoginPage from './LoginPage'
import { protectedPing } from './api'
import { scoreRisk, type RiskScoreResponse } from './api'
import { RiskResultCard } from "./components/RiskResultCard"
import { RiskFlags } from "./components/RiskFlags"
import { AccountsLedger } from './components/AccountsLedger'
import { TransferForm } from './components/TransferForm'
import type { Account } from './types'

import './App.css'

type Session = {
  token: string
  email: string
}
function App() {
  // Authorization
  const [session, setSession] = useState<Session | null>(() => {if (localStorage.getItem('token') && localStorage.getItem('email')) return {token: localStorage.getItem('token')!, email: localStorage.getItem('email')!}; else return null})
  const [pingResult, setPingResult] = useState(null)
  const [pingError, setPingError] = useState<string | null>(null)

  // Risk
  const [amount, setAmount] = useState("600")
  const [currency, setCurrency] = useState("CAD")
  const [riskResult, setRiskResult] = useState<RiskScoreResponse | null>(null)
  const [riskError, setRiskError] = useState<string | null>(null)
  const [riskLoading, setRiskLoading] = useState(false)

  const amountNum = Number(amount)

const currencyClean = currency.trim().toUpperCase()
const amountValid = Number.isFinite(amountNum) && amountNum > 0
const currencyValid = /^[A-Z]{3}$/.test(currencyClean)

const formError =
  !amountValid ? "Amount must be a positive number." :
  !currencyValid ? "Currency must be a 3-letter code (e.g., CAD, USD)." :
  null

  // Accounts and ledger
  const [refreshToken, setRefreshToken] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);

  function refreshAll() {
    setRefreshToken((x) => x + 1);
  }

  async function runPing() {
  setPingError(null)
  try {
    const data = await protectedPing(session?.token)
    setPingResult(data)
  } catch (e) {
    setPingError((e as Error).message)
  }
}

  function handleLoginSuccess(token: string, email: string) {
    localStorage.setItem('token', token)
    localStorage.setItem('email', email)
    setSession({ token, email })
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    setSession(null)
  }

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  async function onScoreRisk() {
  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }
  setRiskError(null)
  setRiskResult(null)
  setRiskLoading(true)

  try {
    const data = await scoreRisk(session.token, amountNum, currencyClean)
    setRiskResult(data)
  } catch (e) {
    setRiskError((e as Error).message)
  } finally {
    setRiskLoading(false)
  }
}

  return (
    <div style={{ maxWidth: 720, margin: '64px auto', padding: 16 }}>
      <h1>Dashboard</h1>
      <p>Logged in as <b>{session.email}</b></p>
      {/* <p>Token: <code>{session.token}</code></p> */}
      <section style={{ marginTop: 24 }}>

  <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Digital Banking Demo</h2>

      <TransferForm token={session.token} accounts={accounts} onTransferSuccess={refreshAll} />

      <AccountsLedger refreshToken={refreshToken} onAccountsLoaded={setAccounts} />

      <RiskFlags refreshToken={refreshToken} />
    </div>
  <h2>Risk Sandbox</h2>

  <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
    <label>
      Amount
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        style={{ width: "100%", padding: 8 }}
      />
    </label>

    <label>
      Currency
      <input
  value={currency}
  onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
  style={{ width: "100%", padding: 8 }}
/>

    </label>

    <button
  onClick={onScoreRisk}
  disabled={riskLoading || !!formError}
  style={{ padding: 10 }}
>
  {riskLoading ? "Scoring..." : "Score Risk"}
</button>
{formError && <div style={{ color: "crimson" }}>{formError}</div>}

    {riskError && <div style={{ color: "crimson" }}>{riskError}</div>}
    {riskResult && <RiskResultCard result={riskResult} />}
  </div>
</section>

      <button onClick={runPing} style={{ padding: 10, marginRight: 8 }}>
        Test Auth Ping
      </button>

      {pingError && <div style={{ color: 'crimson' }}>{pingError}</div>}
      {pingResult && <pre>{JSON.stringify(pingResult, null, 2)}</pre>}

      <button onClick={handleLogout} style={{ padding: 10 }}>
        Logout
      </button>

      <hr />

      <p>Next: Accounts, Transfers, Risk Flags pages.</p>
    </div>
  ) 
}

export default App

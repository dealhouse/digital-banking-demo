import { useState } from 'react'
import { login } from './api'
import { protectedPing } from './api'

type Props = {
    onLoginSuccess: (token: string, email: string) => void
}

export default function LoginPage({ onLoginSuccess }: Props) {
    const [email, setEmail] = useState('student@example.com')
    const [password, setPassword] = useState('test')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [pingResult, setPingResult] = useState(null)
    const [pingError, setPingError] = useState<string | null>(null)

    async function testProtectedPing() {
    setPingResult(null)
    setPingError(null)

  try {
    const data = await protectedPing()
    setPingResult(data) // if you ever see this logged out, auth is broken
  } catch (e) {
    setPingError((e as Error).message)
  }
}
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const data = await login(email, password)
            onLoginSuccess(data.token, data.email)
        } catch (error) {
            setError((error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
        <h1>Digital Banking Demo</h1>
        <p>Login (fake token MVP)</p>

        <button type="button" onClick={testProtectedPing} style={{ padding: 10 }}>
            Test Protected Ping (should 401 before login)
        </button>

{pingError && <pre style={{ color: 'crimson' }}>{pingError}</pre>}
{pingResult && <pre>{JSON.stringify(pingResult, null, 2)}</pre>}


      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>

        <button disabled={loading} type="submit" style={{ padding: 10 }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </form>
    </div>
  )
}


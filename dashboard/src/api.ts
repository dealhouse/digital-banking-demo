export type LoginResponse = {
    token: string;
    email: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Login failed (${response.status})`);
    }
    return response.json();
}

export async function protectedPing(token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch('/api/protected/ping', { headers })
  const text = await res.text()

  if (!res.ok) throw new Error(text || `Ping failed (${res.status})`)
  return JSON.parse(text)
}

export type RiskScoreResponse = {
  riskScore: number
  reasons: string[]
}

export async function scoreRisk(
  token: string,
  amount: number,
  currency: string
): Promise<RiskScoreResponse> {
  const res = await fetch("/api/risk/score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, currency }),
  })

  const text = await res.text()
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized (token missing/expired). Please log in again.")
    throw new Error(text || `Risk score failed (${res.status})`)
  }

  return JSON.parse(text) as RiskScoreResponse
}



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

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const DEMO_TOKEN = import.meta.env.VITE_DEMO_TOKEN ?? "demo-token";

type HttpMethod = "GET" | "POST";

export async function api<T>(
  path: string,
  opts?: { method?: HttpMethod; body?: unknown; headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEMO_TOKEN}`,
      ...(opts?.headers ?? {}),
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error ?? data?.message ?? `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data as T;
}

export function newIdempotencyKey(): string {
  // modern browsers
  if (crypto?.randomUUID) return crypto.randomUUID();
  // fallback
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}




export type LoginResponse = {
    token: string;
    email: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch('${API_BASE}/auth/login', {
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

  const res = await fetch('${API_BASE}/protected/ping', { headers })
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
  const res = await fetch("${API_BASE}/risk/score", {
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

type HttpMethod = "GET" | "POST";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function api<T>(
  path: string,
  opts?: { method?: HttpMethod; body?: unknown; headers?: Record<string, string> },
  token?: string
): Promise<T> {
  const resolvedToken = token ?? getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
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

export type CreateTransferRequest = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  memo?: string;
};

export type CreateTransferResponse = {
  transferId: string;
  status: string;
  amount: number;
  currency: string;
  riskScore: number | null;
  riskLevel: string | null;
  riskReasons: string[];
};

const CORE_API_BASE = import.meta.env.VITE_CORE_API_BASE ?? "http://localhost:8080";

function apiErrorText(status: number, body: { message?: string, error?: string }) {
  // Your core-api returns ApiError; this tries to be readable either way
  return body?.message || body?.error || JSON.stringify(body) || `HTTP ${status}`;
}

export async function createTransfer(token: string, req: CreateTransferRequest): Promise<CreateTransferResponse> {
  const idempotencyKey = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

  const r = await fetch(`${CORE_API_BASE}/api/transfers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  const text = await r.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!r.ok) throw new Error(apiErrorText(r.status, data));
  return data as CreateTransferResponse;
}



// Thin client for the Core API (Spring Boot).
// Responsibilities:
// - attach demo auth header (Authorization: Bearer demo-token)
// - normalize errors into a simple shape the UI can render
// - keep endpoint paths/types in one place (single source of truth)
// Notes:
// - API_BASE is typically a same-origin path ("/api") so Vite can proxy in dev.
// - CORE_API_BASE is a direct absolute URL used when bypassing the proxy (local dev convenience).
// - Some endpoints use custom fetch() wrappers (idempotency header / pageable responses) rather than api<T>().


// -------------------- Auth --------------------

import type { TransferRequest, TransferResponse } from "./types";
export type LoginResponse = {
  token: string;
  email: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
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

// -------------------- Dev tools --------------------
// Demo auth check used during dev to verify the token is being sent correctly.
// If this fails with 401, the UI isn't attaching Authorization properly.


export async function protectedPing(token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/protected/ping`, { headers })
  const text = await res.text()

  if (!res.ok) throw new Error(text || `Ping failed (${res.status})`)
  return JSON.parse(text)
}

// -------------------- Risk scoring --------------------
// Calls core-api -> which forwards to risk-service, then returns explainable reasons.

export type RiskScoreResponse = {
  riskScore: number
  reasons: string[]
}

// Sandbox scoring endpoint (used by Tools tab / quick checks).
// Returns only {riskScore, reasons}. The full transfer flow uses /api/transfers instead.

export async function scoreRisk(
  token: string,
  amount: number,
  currency: string
): Promise<RiskScoreResponse> {
  const res = await fetch(`${API_BASE}/risk/score`, {
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

// Default "/api" assumes a dev proxy (Vite) that forwards to core-api.
// Override via VITE_API_BASE if you deploy with a different gateway/base path.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

type HttpMethod = "GET" | "POST";

// Token is stored by LoginPage after calling login().
// api<T>() will use localStorage by default so most callers don't thread token manually.

function getToken(): string | null {
  return localStorage.getItem("token");
}

// -------------------- Generic JSON client --------------------
// Used by simple endpoints; handles JSON parse + consistent error extraction.

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

  // Read as text first so we can surface backend error bodies even when status != 2xx.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error ?? data?.message ?? `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data as T;
}

// Used to demonstrate idempotency behavior (same key => same result) when core-api supports it.

export function newIdempotencyKey(): string {
  // modern browsers
  if (crypto?.randomUUID) return crypto.randomUUID();
  // fallback
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Direct core-api base URL (used when we don't rely on Vite proxy).
// In a production deploy, you'd usually point this at the same origin / gateway as API_BASE.
const CORE_API_BASE = import.meta.env.VITE_CORE_API_BASE ?? "http://localhost:8080";


function apiErrorText(status: number, body: { message?: string, error?: string }) {
  // Your core-api returns ApiError; this tries to be readable either way
  return body?.message || body?.error || JSON.stringify(body) || `HTTP ${status}`;
}

// -------------------- Transfers --------------------
// These endpoints use direct fetch() so we can attach Idempotency-Key and match core-api paths exactly.

export async function createTransfer(token: string, req: TransferRequest, idempotencyKey: string = newIdempotencyKey()): Promise<TransferResponse> {
  // Idempotency-Key prevents accidental double submits (refresh/click-spam/network retry).
  // core-api should treat identical keys as "return the original transfer result".


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
  return data as TransferResponse;
}

export type TransferDetails = {
  transferId: string;
  status: string;
  amount: number;
  currency: string;
  memo?: string;
  fromAccountId: string;
  toAccountId: string;
  createdAt: string;
  riskScore: number | null;
  riskLevel: string | null;
  riskReasons: string[];
};

export type TransferSummary = {
  transferId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
};

export async function getTransferDetails(
  token: string,
  transferId: string
): Promise<TransferDetails> {
  const r = await fetch(`${CORE_API_BASE}/api/transfers/${transferId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const text = await r.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!r.ok) throw new Error(apiErrorText(r.status, data));
  return data as TransferDetails;
}

export async function searchTransfersByPrefix(
  token: string,
  prefix: string
): Promise<TransferSummary[]> {
  const r = await fetch(
    `${CORE_API_BASE}/api/transfers/search?prefix=${encodeURIComponent(prefix)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const text = await r.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!r.ok) throw new Error(apiErrorText(r.status, data));
  return data as TransferSummary[];
}

// Mirrors Spring Data Page<T> JSON shape returned by core-api for paginated endpoints.

export type PageResp<T> = {
  content: T[];
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export async function listTransfersPage(
  token: string,
  page = 0,
  size = 25
): Promise<PageResp<TransferSummary>> {
  const r = await fetch(`${CORE_API_BASE}/api/transfers?page=${page}&size=${size}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const text = await r.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!r.ok) throw new Error(apiErrorText(r.status, data));
  return data as PageResp<TransferSummary>;
}








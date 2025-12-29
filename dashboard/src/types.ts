// Shared frontend contract types that mirror core-api DTOs.
// Keep these in sync with backend responses to avoid “works on my machine” UI bugs.

export type Account = {
  id: string;
  userId: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | string;
  currency: string;
  balance: number;
  createdAt: string;
};

export type LedgerEntry = {
  id: string;
  accountId: string;
  transferId: string;
  type: "DEBIT" | "CREDIT" | string; // statement convention
  amount: number;
  balance: number;
  createdAt: string;
};

export type TransferRequest = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  memo?: string;
};

// TransferResponse includes risk fields so the UI can show explainable scoring immediately
// after submission (core-api calls risk-service and persists the assessment).

export type TransferResponse = {
  transferId: string;
  status: string;
  amount: number;
  currency: string;
  riskScore: number | null;
  riskLevel: string | null;
  riskReasons: string[];
};

// Persisted risk assessment rows shown in the Risk Flags widget.
// reasonsJson is a DB-friendly representation; parse it if you want structured reasons.

export type RiskFlagItem = {
  transferId: string;
  riskScore: number;
  riskLevel: string;
  reasonsJson: string; // Persisted DB field returned by core-api as a JSON string
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

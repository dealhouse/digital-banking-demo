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

export type TransferResponse = {
  transferId: string;
  status: string;
  amount: number;
  currency: string;
  riskScore: number | null;
  riskLevel: string | null;
  riskReasons: string[]; // if you return reasonsJson instead, change this
};

export type RiskFlagItem = {
  transferId: string;
  riskScore: number;
  riskLevel: string;
  reasonsJson: string; // you can parse client-side later if desired
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

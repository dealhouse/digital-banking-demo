import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock LoginPage so the test doesn't depend on its internal text/markup
vi.mock("./LoginPage", () => ({
  default: () => <div data-testid="login-page">Login</div>,
}));

// Mock “heavy” components that might fetch / use effects
vi.mock("./components/TransferForm", () => ({
  TransferForm: () => <div data-testid="transfer-form" />,
}));

vi.mock("./components/AccountsLedger", () => ({
  AccountsLedger: () => <div data-testid="accounts-ledger" />,
}));

vi.mock("./components/RiskFlags", () => ({
  RiskFlags: () => <div data-testid="risk-flags" />,
}));

vi.mock("./components/RiskResultCard", () => ({
  RiskResultCard: () => <div data-testid="risk-result-card" />,
}));

import App from "./App";

describe("App shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("shows login page when no session", () => {
    render(<App />);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  test("shows dashboard shell when session exists", () => {
    localStorage.setItem("token", "demo-token");
    localStorage.setItem("email", "demo@digitalbanking.dev");

    render(<App />);

    // These are real strings in your App.tsx
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/digital banking demo/i)).toBeInTheDocument();

    // Proves the main sections mount
    expect(screen.getByTestId("transfer-form")).toBeInTheDocument();
    expect(screen.getByTestId("accounts-ledger")).toBeInTheDocument();
    expect(screen.getByTestId("risk-flags")).toBeInTheDocument();

    // You also always render Logout when logged in
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });
});

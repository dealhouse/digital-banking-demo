import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  test("shows dashboard shell and tabs when session exists", async () => {
    localStorage.setItem("token", "demo-token");
    localStorage.setItem("email", "demo@digitalbanking.dev");

    render(<App />);

    // Brand + header
    expect(screen.getByText(/digital banking demo/i)).toBeInTheDocument();
    // We don't care if this is an h1 or div; just that "Dashboard" is visible.
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();

    // Tabs are visible
    const transfersTab = screen.getByRole("button", { name: /transfers/i });
    const riskTab = screen.getByRole("button", { name: /risk & compliance/i });
    const toolsTab = screen.getByRole("button", { name: /tools/i });

    expect(transfersTab).toBeInTheDocument();
    expect(riskTab).toBeInTheDocument();
    expect(toolsTab).toBeInTheDocument();

    // Default tab is "transfers" → transfer + ledger present, risk flags hidden
    expect(screen.getByTestId("transfer-form")).toBeInTheDocument();
    expect(screen.getByTestId("accounts-ledger")).toBeInTheDocument();
    expect(screen.queryByTestId("risk-flags")).not.toBeInTheDocument();

    // Logout button is always present when logged in
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();

    // Switch to Risk & Compliance tab → risk flags should appear
    const user = userEvent.setup();

    await user.click(riskTab);

    expect(screen.getByTestId("risk-flags")).toBeInTheDocument();
    expect(screen.getByText(/risk sandbox/i)).toBeInTheDocument();

    await user.click(toolsTab);

    expect(screen.getByText(/auth ping/i)).toBeInTheDocument();
    expect(screen.getByText(/data refresh/i)).toBeInTheDocument();
    expect(screen.getByText(/transfer inspector/i)).toBeInTheDocument();
    expect(screen.getByText(/notes/i)).toBeInTheDocument();
  });
});

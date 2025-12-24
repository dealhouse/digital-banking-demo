import { render, screen, fireEvent } from "@testing-library/react";
import { vi, expect, test } from "vitest";
import { TransferForm } from "./TransferForm";

vi.mock("../api", () => ({
  newIdempotencyKey: () => "fixed-key",
  api: vi.fn().mockResolvedValue({
    transferId: "t1",
    status: "COMPLETED",
    riskLevel: "MEDIUM",
    riskScore: 30,
    riskReasons: ["large_amount"],
  }),
}));
interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  userId: string;
  createdAt: string;
}

const accounts: Account[] = [
  { id: "a1", name: "Chequing", type: "CHECKING", balance: 1000, currency: "CAD", userId: "u", createdAt: Date.now().toString() },
  { id: "a2", name: "Savings", type: "SAVINGS", balance: 500, currency: "CAD", userId: "v", createdAt: Date.now().toString() },
];

test("shows risk info after successful transfer", async () => {
  render(<TransferForm token={"demo-token"} accounts={accounts} onTransferSuccess={() => {}} />);

  fireEvent.change(screen.getByLabelText(/from/i), { target: { value: "a1" } });
  fireEvent.change(screen.getByLabelText(/to/i), { target: { value: "a2" } });

  fireEvent.click(screen.getByRole("button", { name: /send transfer/i }));

  expect(await screen.findByText(/Risk:/i)).toBeInTheDocument();
  expect(screen.getByText(/large_amount/i)).toBeInTheDocument();
});

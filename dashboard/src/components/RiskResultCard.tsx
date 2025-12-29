// Displays the risk score + reason codes returned by risk-service (via core-api).
// Reasons are meant to be stable identifiers (used by UI + tests), not user prose.

import type { RiskScoreResponse } from "../api";

function scoreMeta(score: number) {
  if (score >= 70) {
    return {
      label: "High risk",
      note: "May require manual review.",
      pill: "border-red-200 bg-red-50 text-red-800",
      accent: "text-red-800",
    };
  }
  if (score >= 40) {
    return {
      label: "Medium risk",
      note: "Proceed with caution.",
      pill: "border-amber-200 bg-amber-50 text-amber-800",
      accent: "text-amber-800",
    };
  }
  return {
    label: "Low risk",
    note: "Looks normal.",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-800",
    accent: "text-emerald-800",
  };
}

function humanReason(r: string) {
  return r.replaceAll("_", " ");
}

export function RiskResultCard({ result }: { result: RiskScoreResponse }) {
  const { label, note, pill, accent } = scoreMeta(result.riskScore);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">Risk score</div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${pill}`}>
          {label}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div className={`text-5xl font-extrabold leading-none ${accent}`}>
          {result.riskScore}
        </div>
        <div className="pb-1 text-sm font-semibold text-slate-500">/100</div>
      </div>

      <div className="mt-2 text-sm text-slate-600">{note}</div>

      <div className="mt-4">
        <div className="text-sm font-semibold text-slate-900">Reasons</div>

        {result.reasons?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {result.reasons.map((r) => (
              <span
                key={r}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
              >
                {humanReason(r)}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-500">No flags raised.</div>
        )}
      </div>
    </div>
  );
}

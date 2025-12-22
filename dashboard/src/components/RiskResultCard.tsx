import type { RiskScoreResponse } from '../api'

function scoreLabel(score: number) {
    if (score >= 70) return {label: "High risk", note: "May require manual review."}
    if (score >= 40) return {label: "Medium risk", note: "Proceed with caution."}
    return {label: "Low risk", note: "Looks normal."}
}

export function RiskResultCard({ result }: { result: RiskScoreResponse }) {
    const { label, note } = scoreLabel(result.riskScore)

    return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 14,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Risk Score</div>
        <div style={{ fontSize: 14 }}>{label}</div>
      </div>

      <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>
        {result.riskScore}
        <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 6 }}>/100</span>
      </div>

      <div style={{ fontSize: 14, color: "#555" }}>{note}</div>

      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Reasons</div>

        {result.reasons?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {result.reasons.map((r) => (
              <li key={r} style={{ fontSize: 14 }}>
                {r.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 14, color: "#555" }}>No flags raised.</div>
        )}
      </div>
    </div>
  )
}

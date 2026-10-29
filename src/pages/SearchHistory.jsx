import { Clock, RotateCcw, Trash2, Search } from "lucide-react";

export default function SearchHistory({ ctx }) {
  if (!ctx.history.length) {
    return (
      <div>
        <div className="page-header">
          <span className="eyebrow">Search Trail & Session Log</span>
          <h1 className="page-title">Search History</h1>
          <p className="page-subtitle">
            Review and re-run your previous literature queries.
          </p>
        </div>

        <div className="empty-state">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--bg-muted)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 12px",
              color: "var(--text-secondary)",
            }}
          >
            <Clock size={22} strokeWidth={1.8} />
          </div>
          <h3>No search history recorded</h3>
          <p>
            Your search queries in this browser will be captured here for rapid re-examination.
          </p>
          <button
            type="button"
            className="btn-rust"
            onClick={() => ctx.go("dashboard")}
          >
            <Search size={15} />
            <span>Start Searching</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Search Trail & Session Log</span>
        <h1 className="page-title">Search History</h1>
        <p className="page-subtitle">
          Recorded queries from your active research session, stored locally in your browser.
        </p>
      </div>

      <div className="section-row-header" style={{ marginBottom: 14 }}>
        <span className="muted small">
          <strong>{ctx.history.length}</strong> recorded searches
        </span>
        <button
          type="button"
          className="control-btn"
          onClick={ctx.clearHistory}
        >
          <Trash2 size={14} /> Clear History
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {ctx.history.map((h) => (
          <li
            key={h.q + h.t}
            className="search-workspace-card"
            style={{
              padding: "16px 20px",
              marginBottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong style={{ fontSize: 16, color: "var(--text-primary)" }}>{h.q}</strong>
              <div className="muted small" style={{ marginTop: 2 }}>
                Searched on {new Date(h.t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>

            <button
              type="button"
              className="btn-rust"
              style={{ padding: "6px 14px", fontSize: 13 }}
              onClick={() => ctx.runSearch(h.q)}
            >
              <RotateCcw size={13} strokeWidth={2} />
              <span>Search Again</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Search, Trash2, Download } from "lucide-react";
import ComparisonTable from "../components/ComparisonTable.jsx";
import TopicChips from "../components/TopicChips.jsx";
import { getPaper, commonTopics, uniqueTopics } from "../data/papers.js";

export default function ComparePapers({ ctx }) {
  const papers = ctx.compare.map(getPaper).filter(Boolean);

  const handleExportCSV = () => {
    if (!papers.length) return;
    const headers = ["Feature", ...papers.map((p) => `"${p.title.replace(/"/g, '""')}"`)].join(",");
    const rows = [
      ["Authors", ...papers.map((p) => `"${p.authors.join(", ").replace(/"/g, '""')}"`)],
      ["Year", ...papers.map((p) => p.year)],
      ["Category", ...papers.map((p) => `"${p.category}"`)],
      ["Topics", ...papers.map((p) => `"${p.topics.join("; ")}"`)],
      ["Keywords", ...papers.map((p) => `"${p.keywords.join("; ")}"`)],
      ["DOI", ...papers.map((p) => `"${p.doi || "N/A"}"`)],
      ["Abstract", ...papers.map((p) => `"${p.abstract.replace(/"/g, '""')}"`)],
    ];
    const csvContent = [headers, ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison_matrix_${papers.length}_papers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!papers.length) {
    return (
      <div>
        <div className="page-header">
          <span className="eyebrow">Comparative Matrix</span>
          <h1 className="page-title">Compare Research Papers</h1>
          <p className="page-subtitle">
            Side-by-side evaluation of methodology, research topics, and keywords across multiple publications.
          </p>
        </div>

        <div className="empty-state">
          <h3>No publications selected for comparison</h3>
          <p>
            Select 2 to 4 papers from Discover, Search, or Recommendations to inspect their parameters side by side.
          </p>
          <button
            type="button"
            className="btn-rust"
            onClick={() => ctx.go("search")}
          >
            <Search size={15} strokeWidth={1.8} />
            <span>Browse Research Index</span>
          </button>
        </div>
      </div>
    );
  }

  const common = commonTopics(papers);
  const unique = uniqueTopics(papers);

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Comparative Matrix</span>
        <h1 className="page-title">Compare Research Papers</h1>
        <p className="page-subtitle">
          Side-by-side evaluation across {papers.length} publications.
        </p>
      </div>

      <div className="section-row-header" style={{ marginBottom: 12 }}>
        <span className="muted small">
          Comparing <strong>{papers.length}</strong> of 4 allowed publications
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="control-btn"
            onClick={handleExportCSV}
            title="Download comparative matrix as CSV"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            className="control-btn"
            onClick={() => ctx.go("search")}
          >
            <Search size={14} /> Add Papers
          </button>
          <button
            type="button"
            className="control-btn"
            onClick={ctx.clearCompare}
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {papers.length < 2 && (
        <div className="why-pill" style={{ marginBottom: 16 }}>
          Select at least one additional paper to analyze common and unique topics.
        </div>
      )}

      <ComparisonTable papers={papers} ctx={ctx} />

      {papers.length >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginTop: 24 }}>
          <section className="search-workspace-card" style={{ marginBottom: 0 }}>
            <span className="eyebrow">Shared Domain Signals</span>
            <h3 style={{ fontSize: 20, margin: "6px 0 8px" }}>Common Topics</h3>
            <p className="muted small" style={{ marginBottom: 14 }}>
              Topics shared across all {papers.length} compared publications.
            </p>
            {common.length ? (
              <TopicChips items={common} onSelect={(t) => ctx.runSearch(t)} />
            ) : (
              <p className="muted small">No overlapping topics shared by all selected papers.</p>
            )}
          </section>

          <section className="search-workspace-card" style={{ marginBottom: 0 }}>
            <span className="eyebrow">Differentiating Signals</span>
            <h3 style={{ fontSize: 20, margin: "6px 0 8px" }}>Unique Topics</h3>
            <p className="muted small" style={{ marginBottom: 14 }}>
              Topics specific to an individual publication in this set.
            </p>
            {papers.map((p) => (
              <div key={p.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  {p.title}
                </div>
                {unique[p.id]?.length ? (
                  <TopicChips items={unique[p.id]} variant="sm" onSelect={(t) => ctx.runSearch(t)} />
                ) : (
                  <span className="muted small">No unique topics in this set</span>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

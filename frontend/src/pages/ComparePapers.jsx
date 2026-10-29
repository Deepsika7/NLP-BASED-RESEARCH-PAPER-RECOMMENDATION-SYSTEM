import { useEffect, useState } from "react";
import { Search, Trash2, Download } from "lucide-react";
import ComparisonTable from "../components/ComparisonTable.jsx";
import TopicChips from "../components/TopicChips.jsx";
import { getPaper } from "../data/papers.js";
import { api } from "../api.js";

export default function ComparePapers({ ctx }) {
  const papers = ctx.compare.map(getPaper).filter(Boolean);

  const ids = papers.map((p) => p.id);
  const idKey = ids.join(",");

  // Common / unique topic analysis is computed server-side.
  const [analysis, setAnalysis] = useState(null);
  useEffect(() => {
    if (ids.length < 2) { setAnalysis(null); return undefined; }
    let live = true;
    api.compare(ids).then((r) => live && setAnalysis(r)).catch(() => live && setAnalysis({ common: [], unique: {} }));
    return () => { live = false; };
  }, [idKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportCSV = () => {
    if (!papers.length) return;
    api.downloadComparison(ids, `comparison_matrix_${papers.length}_papers.csv`).catch(() => ctx.flash("Export failed"));
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

  const common = analysis?.common || [];
  const unique = analysis?.unique || {};

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
            {!analysis ? (
              <p className="muted small">Analysing topics…</p>
            ) : common.length ? (
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

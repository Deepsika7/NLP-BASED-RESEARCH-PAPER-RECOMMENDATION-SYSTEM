import { X, Eye, Quote, ExternalLink } from "lucide-react";
import TopicChips from "./TopicChips.jsx";

export default function ComparisonTable({ papers, ctx }) {
  const rows = [
    ["Authors", (p) => p.authors.join(", ")],
    ["Publication Year", (p) => <span className="mono">{p.year}</span>],
    ["Category", (p) => <span className="category-tag">{p.category}</span>],
    ["Abstract", (p) => <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#37332E" }}>{p.abstract}</p>],
    ["Research Topics", (p) => <TopicChips items={p.topics} variant="sm" onSelect={(t) => ctx.runSearch(t)} />],
    ["Keywords", (p) => <TopicChips items={p.keywords} variant="sm" onSelect={(k) => ctx.runSearch(k)} />],
    [
      "DOI",
      (p) =>
        p.doi ? (
          <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" className="mono small">
            {p.doi}
          </a>
        ) : (
          <span className="muted small">Upon publication</span>
        ),
    ],
    [
      "Google Scholar",
      (p) => (
        <a
          href={p.scholarUrl || `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`}
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent)" }}
        >
          View Scholar Profile <ExternalLink size={12} />
        </a>
      ),
    ],
    [
      "Publication Source",
      (p) =>
        p.url ? (
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            Direct Access <ExternalLink size={12} />
          </a>
        ) : (
          <span className="muted small">—</span>
        ),
    ],
  ];

  return (
    <div className="compare-table-wrapper">
      <table className="compare-table" style={{ minWidth: 160 + papers.length * 280 }}>
        <thead>
          <tr>
            <th className="row-header">Feature</th>
            {papers.map((p) => (
              <th key={p.id}>
                <div className="compare-col-header">
                  <div className="compare-col-title">{p.title}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-card-action primary"
                      onClick={() => ctx.openPaper(p.id)}
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      className="btn-card-action"
                      onClick={() => ctx.openCite?.(p)}
                    >
                      <Quote size={13} /> Cite
                    </button>
                    <button
                      type="button"
                      className="btn-card-action"
                      onClick={() => ctx.removeCompare(p.id)}
                    >
                      <X size={13} /> Remove
                    </button>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, render]) => (
            <tr key={label}>
              <th className="row-header">{label}</th>
              {papers.map((p) => (
                <td key={p.id}>{render(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

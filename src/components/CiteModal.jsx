import { useState } from "react";
import { X, Copy, Check, Download, Quote } from "lucide-react";
import { toBibtex, toApa, toChicago } from "../data/papers.js";

export default function CiteModal({ paper, open, onClose, onCopy }) {
  const [format, setFormat] = useState("bibtex");
  const [copied, setCopied] = useState(false);

  if (!open || !paper) return null;

  const content =
    format === "bibtex"
      ? toBibtex(paper)
      : format === "apa"
      ? toApa(paper)
      : toChicago(paper);

  const handleCopy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    if (onCopy) onCopy("Citation copied to clipboard");
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownload = () => {
    const bib = toBibtex(paper);
    const blob = new Blob([bib], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(paper.authors[0] || "citation").replace(/[^a-zA-Z]/g, "")}_${paper.year}.bib`;
    a.click();
    URL.revokeObjectURL(url);
    if (onCopy) onCopy("Downloaded .bib citation file");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="navbar-brand-logo" style={{ width: 28, height: 28 }}>
              <Quote size={14} strokeWidth={2} />
            </span>
            <h3 className="modal-title" style={{ fontSize: 20 }}>
              Cite Publication
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <p className="paper-card-authors" style={{ marginBottom: 14 }}>
          <strong>{paper.title}</strong>
        </p>

        {/* Format Selector Pills */}
        <div className="chips-row" style={{ marginBottom: 12 }}>
          {["bibtex", "apa", "chicago"].map((fmt) => (
            <button
              key={fmt}
              type="button"
              className={"topic-pill" + (format === fmt ? " active" : "")}
              style={{ textTransform: "uppercase", fontSize: 11.5, letterSpacing: "0.08em", padding: "4px 12px" }}
              onClick={() => {
                setFormat(fmt);
                setCopied(false);
              }}
            >
              {fmt === "bibtex" ? "BibTeX" : fmt === "apa" ? "APA 7th" : "Chicago"}
            </button>
          ))}
        </div>

        {/* Citation Box */}
        <div
          style={{
            backgroundColor: "var(--bg-muted)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xs)",
            padding: "14px 16px",
            fontFamily: format === "bibtex" ? "var(--font-mono)" : "inherit",
            fontSize: format === "bibtex" ? 12 : 13.5,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 220,
            overflowY: "auto",
            userSelect: "all",
          }}
        >
          {content}
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            className="control-btn"
            onClick={handleDownload}
            title="Download BibTeX (.bib) file"
          >
            <Download size={14} /> Download .bib
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="control-btn" onClick={onClose}>
              Done
            </button>
            <button
              type="button"
              className="btn-rust"
              onClick={handleCopy}
              style={{ minWidth: 140 }}
            >
              {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "Copy Citation"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

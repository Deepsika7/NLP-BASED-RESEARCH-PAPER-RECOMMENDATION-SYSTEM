import { X } from "lucide-react";
import { papers, categories, allTopics } from "../data/papers.js";

export default function ProjectOverviewModal({ open, onClose, ctx }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Project Workspace</span>
            <h3 className="modal-title">01 / Literature Index & Recommendation</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <p className="muted small" style={{ marginTop: 4, marginBottom: 16 }}>
          Literature discovery workspace with lexical token expansion, multi-field weighted scoring, and reading list synthesis.
        </p>

        <div className="sample-mode-badge" style={{ marginBottom: 14 }}>
          <span className="sample-mode-dot" /> Live Heuristic Engine
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-box-value">{papers.length}</div>
            <div className="stat-box-label">Indexed Publications</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-value">{categories.length}</div>
            <div className="stat-box-label">Core Categories</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-value">{allTopics.length}</div>
            <div className="stat-box-label">Research Topics</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-value">{ctx.saved.length}</div>
            <div className="stat-box-label">Saved in Note</div>
          </div>
        </div>

        <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: 10 }}>
            Session Summary
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Active Comparisons:</span>
              <strong>{ctx.compare.length} of 4 papers</strong>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Recorded Searches:</span>
              <strong>{ctx.history.length} queries</strong>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Personal Notes:</span>
              <strong>{Object.keys(ctx.notes || {}).length} annotated papers</strong>
            </li>
          </ul>
        </div>

        <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn-rust" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

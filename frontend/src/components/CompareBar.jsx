import { X, GitCompare, ArrowRight } from "lucide-react";
import { getPaper } from "../data/papers.js";

export default function CompareBar({ ctx }) {
  const selected = ctx.compare.map(getPaper).filter(Boolean);
  if (!selected.length) return null;
  const full = selected.length >= 4;

  return (
    <aside className="compare-dock" aria-label="Selected papers comparison tray">
      <div className="content-container">
        <div className="compare-dock-left">
          <div className="compare-dock-count">
            {selected.length} of 4 selected
          </div>

          <div className="compare-dock-chips">
            {selected.map((p) => (
              <span key={p.id} className="compare-dock-chip" title={p.title}>
                <span
                  style={{
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.title}
                </span>
                <button
                  type="button"
                  className="compare-dock-chip-remove"
                  onClick={() => ctx.removeCompare(p.id)}
                  aria-label={"Remove " + p.title}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="compare-dock-actions">
          <button
            type="button"
            className="control-btn"
            onClick={ctx.clearCompare}
          >
            Clear All
          </button>
          <button
            type="button"
            className="btn-rust"
            disabled={selected.length < 2}
            onClick={() => ctx.go("compare")}
            title={selected.length < 2 ? "Select at least 2 papers to compare" : "Proceed to comparative view"}
          >
            <GitCompare size={14} strokeWidth={1.8} />
            <span>Compare Papers</span>
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

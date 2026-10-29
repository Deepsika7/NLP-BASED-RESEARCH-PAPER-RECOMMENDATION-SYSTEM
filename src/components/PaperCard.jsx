import { useState } from "react";
import { Bookmark, BookmarkCheck, GitCompare, Check, Eye, Quote, ExternalLink, ChevronDown, ChevronUp, Clock, FileEdit } from "lucide-react";
import TopicChips from "./TopicChips.jsx";
import { readingTime } from "../data/papers.js";

function highlightText(text, query) {
  if (!query || query.trim().length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
  );
}

export default function PaperCard({ paper, ctx, why, highlightQuery }) {
  const [expanded, setExpanded] = useState(false);
  const isSaved = ctx.saved.includes(paper.id);
  const inCompare = ctx.compare.includes(paper.id);
  const hasNote = !!(ctx.notes?.[paper.id]);
  const noteText = ctx.notes?.[paper.id] || "";

  const act = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <article
      className="paper-card"
      onClick={() => ctx.openPaper(paper.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.openPaper(paper.id);
        }
      }}
    >
      <div className="paper-card-top">
        <span className="category-tag">{paper.category}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="reading-time-badge">
            <Clock size={10} />
            {readingTime(paper)}
          </span>
          {hasNote && (
            <span className="note-indicator" onClick={(e) => e.stopPropagation()}>
              <FileEdit size={11} />
              <span className="note-tooltip">{noteText.slice(0, 120)}{noteText.length > 120 ? "…" : ""}</span>
            </span>
          )}
          <a
            href={paper.url || `https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noreferrer"
            className="paper-year"
            onClick={(e) => e.stopPropagation()}
            title="View paper source"
            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--accent)", textDecoration: "none" }}
          >
            View Paper <ExternalLink size={10} />
          </a>
          <span className="paper-year">{paper.year}</span>
        </div>
      </div>

      <h3 className="paper-card-title">
        <button className="paper-card-title-btn" onClick={act(() => ctx.openPaper(paper.id))}>
          {highlightText(paper.title, highlightQuery)}
        </button>
      </h3>

      <p className="paper-card-authors">{paper.authors.join(", ")}</p>

      {paper.tldr && (
        <div className="tldr-badge">
          <span className="tldr-label">TL;DR</span>
          <span>{paper.tldr}</span>
        </div>
      )}

      <div>
        <p className={expanded ? "paper-card-abstract-full" : "paper-card-abstract"}>
          {highlightText(paper.abstract, highlightQuery)}
        </p>
        {paper.abstract.length > 180 && (
          <button
            type="button"
            className="search-sample-tag"
            style={{ fontSize: 12, marginTop: 2, display: "inline-flex", alignItems: "center", gap: 3 }}
            onClick={act(() => setExpanded(!expanded))}
          >
            {expanded ? <><span>Show less</span> <ChevronUp size={12} /></> : <><span>Read abstract</span> <ChevronDown size={12} /></>}
          </button>
        )}
      </div>

      <div className="paper-card-topics">
        <TopicChips items={paper.topics.slice(0, 4)} variant="sm" onSelect={(t) => ctx.runSearch(t)} />
      </div>

      {why && <div className="why-pill"><strong>Why this paper:</strong> {why}</div>}

      <div className="paper-card-divider" />

      <div className="paper-card-actions">
        <button type="button" className="btn-card-action primary" onClick={act(() => ctx.openPaper(paper.id))} title="Open complete paper details">
          <Eye size={13} strokeWidth={1.8} /> View
        </button>
        <button type="button" className="btn-card-action" onClick={act(() => ctx.openCite?.(paper))} title="Generate citation">
          <Quote size={13} strokeWidth={1.8} /> Cite
        </button>
        <button type="button" className={"btn-card-action" + (isSaved ? " active" : "")} onClick={act(() => ctx.toggleSave(paper.id))}>
          {isSaved ? <BookmarkCheck size={13} strokeWidth={2} /> : <Bookmark size={13} strokeWidth={1.8} />}
          <span>{isSaved ? "Saved" : "Save"}</span>
        </button>
        <button type="button" className={"btn-card-action" + (inCompare ? " active" : "")} onClick={act(() => ctx.toggleCompare(paper.id))}>
          {inCompare ? <Check size={13} strokeWidth={2} /> : <GitCompare size={13} strokeWidth={1.8} />}
          <span>{inCompare ? "Compared" : "Compare"}</span>
        </button>
      </div>
    </article>
  );
}

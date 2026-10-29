import { useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, GitCompare, Check, ExternalLink, Quote, FileEdit, CheckCircle2, Copy, ClipboardCheck } from "lucide-react";
import TopicChips from "./TopicChips.jsx";
import PaperCard from "./PaperCard.jsx";
import { relatedPapers } from "../data/papers.js";

const TITLES = {
  dashboard: "Discovery",
  search: "Search",
  recommendations: "Method",
  compare: "Compare Papers",
  saved: "Project note",
  history: "Search History",
};

export default function PaperDetails({ paper, ctx }) {
  const isSaved = ctx.saved.includes(paper.id);
  const inCompare = ctx.compare.includes(paper.id);
  const from = ctx.view.from || "search";
  const backLabel = from === "search" ? "Back to Results" : "Back to " + (TITLES[from] || "Discovery");
  const related = relatedPapers(paper);

  const currentNote = ctx.notes?.[paper.id] || "";
  const [noteText, setNoteText] = useState(currentNote);
  const [savedNoteStatus, setSavedNoteStatus] = useState(false);
  const [doiCopied, setDoiCopied] = useState(false);

  const handleSaveNote = () => {
    ctx.setNote?.(paper.id, noteText);
    setSavedNoteStatus(true);
    setTimeout(() => setSavedNoteStatus(false), 2000);
  };

  const handleCopyDoi = () => {
    if (paper.doi) {
      navigator.clipboard.writeText(paper.doi).then(() => {
        setDoiCopied(true);
        setTimeout(() => setDoiCopied(false), 2000);
      });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <button
          className="control-btn"
          onClick={() => ctx.go(from)}
          aria-label={backLabel}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          <span>{backLabel}</span>
        </button>
      </div>

      <article className="paper-details-card">
        <div className="paper-card-top">
          <span className="category-tag">{paper.category}</span>
          <span className="paper-year">Published {paper.year}</span>
        </div>

        <h2 className="paper-details-title">{paper.title}</h2>
        <p className="paper-details-authors">{paper.authors.join(", ")}</p>

        <div className="paper-card-actions" style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={"btn-card-action" + (isSaved ? " active" : "")}
            onClick={() => ctx.toggleSave(paper.id)}
          >
            {isSaved ? <BookmarkCheck size={14} strokeWidth={2} /> : <Bookmark size={14} strokeWidth={1.8} />}
            <span>{isSaved ? "Saved in Notes" : "Save Paper"}</span>
          </button>

          <button
            type="button"
            className={"btn-card-action" + (inCompare ? " active" : "")}
            onClick={() => ctx.toggleCompare(paper.id)}
          >
            {inCompare ? <Check size={14} strokeWidth={2} /> : <GitCompare size={14} strokeWidth={1.8} />}
            <span>{inCompare ? "In Comparison" : "Compare"}</span>
          </button>

          <button
            type="button"
            className="btn-card-action"
            onClick={() => ctx.openCite?.(paper)}
          >
            <Quote size={14} strokeWidth={1.8} />
            <span>Cite</span>
          </button>

          <a
            href={paper.url || `https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noreferrer"
            className="btn-card-action primary"
            style={{ textDecoration: "none" }}
          >
            <span>View Paper</span>
            <ExternalLink size={13} />
          </a>
        </div>

        <div className="meta-field-label">Abstract</div>
        <p className="paper-details-abstract">{paper.abstract}</p>

        <div style={{ margin: "20px 0" }}>
          <div className="meta-field-label">Research Topics</div>
          <TopicChips items={paper.topics} onSelect={(t) => ctx.runSearch(t)} />
        </div>

        <div style={{ margin: "20px 0" }}>
          <div className="meta-field-label">Keywords</div>
          <TopicChips items={paper.keywords} variant="sm" onSelect={(k) => ctx.runSearch(k)} />
        </div>

        <div className="details-meta-grid">
          <div>
            <div className="meta-field-label">Category</div>
            <p style={{ margin: 0, fontWeight: 500 }}>{paper.category}</p>
          </div>
          <div>
            <div className="meta-field-label">Year</div>
            <p style={{ margin: 0, fontWeight: 500 }}>{paper.year}</p>
          </div>
          <div>
            <div className="meta-field-label">Digital Object Identifier (DOI)</div>
            <p className="mono small" style={{ margin: 0, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
              {paper.doi ? (
                <>
                  <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">
                    {paper.doi}
                  </a>
                  <button
                    type="button"
                    className={"copy-doi-btn" + (doiCopied ? " copied" : "")}
                    onClick={handleCopyDoi}
                    title="Copy DOI to clipboard"
                  >
                    {doiCopied ? <ClipboardCheck size={11} /> : <Copy size={11} />}
                    {doiCopied ? "Copied!" : "Copy"}
                  </button>
                </>
              ) : (
                "Upon Publication"
              )}
            </p>
          </div>
        </div>

        {/* Interactive Researcher Note Section */}
        <div style={{ marginTop: 28, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div className="meta-field-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <FileEdit size={13} /> Personal Research Notes
            </div>
            {savedNoteStatus && (
              <span className="small" style={{ color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CheckCircle2 size={13} /> Saved
              </span>
            )}
          </div>
          <textarea
            className="filter-select"
            rows={3}
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            placeholder="Annotate key methodologies, equations, or synthesis observations for your project note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn-rust" style={{ padding: "6px 14px", fontSize: 13 }} onClick={handleSaveNote}>
              Save Note
            </button>
          </div>
        </div>
      </article>

      {/* Related Papers — Horizontal Carousel */}
      {related.length > 0 && (
        <section className="section" style={{ marginTop: 36 }}>
          <div className="section-row-header">
            <div className="section-title-wrap">
              <h3 className="section-title">Related Research</h3>
              <span className="section-count-badge">
                {String(related.length).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div className="related-carousel">
            {related.map((p) => (
              <PaperCard key={p.id} paper={p} ctx={ctx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

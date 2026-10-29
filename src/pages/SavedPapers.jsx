import { useState } from "react";
import { Bookmark, Search, Download, FileEdit } from "lucide-react";
import PaperCard from "../components/PaperCard.jsx";
import { getPaper, toBibtex, toApa } from "../data/papers.js";

const TAG_OPTIONS = [
  { key: "to-read", label: "To Read" },
  { key: "reading", label: "Reading" },
  { key: "done", label: "Done" },
  { key: "important", label: "Important" },
];

export default function SavedPapers({ ctx }) {
  const list = ctx.saved.map(getPaper).filter(Boolean);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState("");
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rai_tags") || "{}"); } catch { return {}; }
  });

  const setTag = (id, tag) => {
    setTags((prev) => {
      const next = { ...prev, [id]: prev[id] === tag ? null : tag };
      localStorage.setItem("rai_tags", JSON.stringify(next));
      return next;
    });
  };

  const handleStartEdit = (id) => { setEditingNoteId(id); setTempNote(ctx.notes?.[id] || ""); };
  const handleSaveNote = (id) => { ctx.setNote?.(id, tempNote); setEditingNoteId(null); };

  const handleExportCSV = () => {
    if (!list.length) return;
    const headers = ["Title", "Authors", "Year", "Category", "DOI", "URL", "TL;DR", "Tag", "Note"];
    const rows = list.map((p) => [
      `"${p.title}"`,
      `"${p.authors.join("; ")}"`,
      p.year,
      `"${p.category}"`,
      p.doi || "",
      p.url || "",
      `"${(p.tldr || "").replace(/"/g, '""')}"`,
      tags[p.id] || "",
      `"${(ctx.notes?.[p.id] || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reading_list_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    if (!list.length) return;
    let md = `# Research Index — Curated Reading List\n\nGenerated: ${new Date().toLocaleDateString()}  |  Total: ${list.length} papers\n\n---\n\n`;
    list.forEach((p, idx) => {
      const note = ctx.notes?.[p.id];
      const tag = tags[p.id];
      md += `### ${idx + 1}. ${p.title}\n`;
      if (tag) md += `**Status:** ${tag}  `;
      md += `**Authors:** ${p.authors.join(", ")} (${p.year})  **Category:** ${p.category}\n`;
      if (p.doi) md += `**DOI:** \`${p.doi}\`  `;
      if (p.url) md += `**Link:** [${p.url}](${p.url})\n`;
      if (p.tldr) md += `\n> **TL;DR:** ${p.tldr}\n`;
      md += `\n${p.abstract}\n\n`;
      if (note) md += `> **Personal Note:** ${note}\n\n`;
      md += `---\n\n`;
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reading_list_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBibtex = () => {
    if (!list.length) return;
    const bib = list.map(toBibtex).join("\n\n");
    const blob = new Blob([bib], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reading_list_${new Date().toISOString().slice(0, 10)}.bib`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!list.length) {
    return (
      <div>
        <div className="page-header">
          <span className="eyebrow">Project Reading List</span>
          <h1 className="page-title">Saved Papers & Notes</h1>
          <p className="page-subtitle">Curate and preserve essential literature for your ongoing research questions.</p>
        </div>
        <div className="empty-state">
          <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-muted)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--text-secondary)" }}>
            <Bookmark size={22} strokeWidth={1.8} />
          </div>
          <h3>Your reading list is empty</h3>
          <p>Use the "Save" action on any paper card to compile your bibliography and personal notes here.</p>
          <button type="button" className="btn-rust" onClick={() => ctx.go("dashboard")}>
            <Search size={15} /> <span>Discover Papers</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Project Reading List</span>
        <h1 className="page-title">Saved Papers & Notes</h1>
        <p className="page-subtitle">Curated collection of publications kept for literature review and active citation.</p>
      </div>

      <div className="section-row-header">
        <div className="section-title-wrap">
          <h2 className="section-title" style={{ fontSize: 22 }}>Saved Publications</h2>
          <span className="section-count-badge">{String(list.length).padStart(2, "0")} {list.length === 1 ? "paper" : "papers"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="export-btn" onClick={handleExportCSV} title="Download as CSV">
            <Download size={13} /> CSV
          </button>
          <button type="button" className="export-btn" onClick={handleExportMarkdown} title="Download as Markdown">
            <Download size={13} /> Markdown
          </button>
          <button type="button" className="export-btn" onClick={handleExportBibtex} title="Download as BibTeX">
            <Download size={13} /> BibTeX
          </button>
        </div>
      </div>

      <div className="papers-grid">
        {list.map((p) => {
          const note = ctx.notes?.[p.id];
          const currentTag = tags[p.id];
          const isEditing = editingNoteId === p.id;
          return (
            <div key={p.id} style={{ display: "flex", flexDirection: "column" }}>
              <PaperCard paper={p} ctx={ctx} />

              {/* Tag row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px 2px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "none" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Tag:</span>
                {TAG_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`paper-tag ${key}${currentTag === key ? "" : " inactive"}`}
                    style={{ opacity: currentTag && currentTag !== key ? 0.45 : 1 }}
                    onClick={() => setTag(p.id, key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Notes panel */}
              <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 var(--radius-sm) var(--radius-sm)", padding: "10px 18px 14px", marginBottom: 10, fontSize: 13 }}>
                {isEditing ? (
                  <div>
                    <textarea
                      className="filter-select"
                      rows={2}
                      style={{ width: "100%", fontSize: 12.5 }}
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Write your research notes..."
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
                      <button type="button" className="control-btn" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => setEditingNoteId(null)}>Cancel</button>
                      <button type="button" className="btn-rust" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => handleSaveNote(p.id)}>Save Note</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      {note ? (
                        <p style={{ margin: 0, color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.45 }}>"{note}"</p>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>No personal notes added yet.</span>
                      )}
                    </div>
                    <button type="button" className="control-btn" style={{ padding: "3px 8px", fontSize: 11.5, flexShrink: 0 }} onClick={() => handleStartEdit(p.id)}>
                      <FileEdit size={12} /> {note ? "Edit Note" : "+ Note"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

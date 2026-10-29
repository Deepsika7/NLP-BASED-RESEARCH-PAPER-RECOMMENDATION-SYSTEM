import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, FileSearch } from "lucide-react";
import SearchBar from "../components/SearchBar.jsx";
import PaperCard from "../components/PaperCard.jsx";
import { papers, categories, allTopics, allYears, searchPapers } from "../data/papers.js";

function buildSuggestions(query, paperList, topicList) {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase();
  const results = [];
  topicList.forEach((t) => { if (t.toLowerCase().includes(q)) results.push({ text: t, type: "topic" }); });
  paperList.forEach((p) => { if (p.title.toLowerCase().includes(q)) results.push({ text: p.title, type: "paper" }); });
  return results.slice(0, 8);
}

function NoResults({ query, onReset }) {
  const suggestions = ["Deep Learning", "Cancer Research", "NLP", "Semantic Search", "Healthcare AI"];
  return (
    <div className="no-results-state">
      <div className="no-results-icon">
        <FileSearch size={32} strokeWidth={1.5} />
      </div>
      <h3 className="no-results-title">No papers found</h3>
      <p className="no-results-desc">
        No results for <strong>"{query}"</strong>. Try a broader term, different keywords, or explore a suggested topic below.
      </p>
      <div className="no-results-suggestions">
        {suggestions.map((s) => (
          <button key={s} type="button" className="topic-pill" onClick={() => onReset(s)}>{s}</button>
        ))}
      </div>
      <button type="button" className="control-btn" style={{ marginTop: 8 }} onClick={() => onReset("")}>
        Clear all filters
      </button>
    </div>
  );
}

export default function SearchPapers({ ctx }) {
  const { search, setSearch } = ctx;
  const [input, setInput] = useState(search.query);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { setInput(search.query); }, [search.query]);

  const suggestions = useMemo(() => buildSuggestions(input, papers, allTopics), [input]);
  const results = useMemo(() => searchPapers(papers, search), [search]);
  const set = (patch) => setSearch((s) => ({ ...s, ...patch }));
  const filtered = search.query || search.category || search.topic || search.year;

  const handleReset = (q = "") => {
    setInput(q);
    if (q) {
      ctx.commitSearch(q);
    } else {
      ctx.resetSearch();
    }
  };

  return (
    <div>
      <div className="page-header">
        <span className="eyebrow">Literature Search</span>
        <h1 className="page-title">Search Research Papers</h1>
        <p className="page-subtitle">Query indexed publications across titles, abstracts, topics, and keywords.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchBar
          large
          value={input}
          onChange={setInput}
          onSubmit={(overrideQ) => ctx.commitSearch(overrideQ ?? input)}
          onClear={() => { setInput(""); ctx.resetSearch(); }}
          placeholder="Search papers by title, abstract, keyword, or topic..."
          buttonLabel="Search"
          suggestions={suggestions}
        />
      </div>

      {/* Advanced Filters Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button
          type="button"
          className={"control-btn" + (showAdvanced ? " active" : "")}
          onClick={() => setShowAdvanced((p) => !p)}
        >
          <SearchIcon size={13} strokeWidth={1.8} />
          {showAdvanced ? "Hide Filters" : "Advanced Filters"}
        </button>
        {filtered && (
          <button type="button" className="control-btn" onClick={() => handleReset("")}>
            Reset All
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="advanced-filters-panel">
          <div>
            <div className="filter-field-label">Category</div>
            <select className="filter-select" value={search.category || ""} onChange={(e) => set({ category: e.target.value })}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <div className="filter-field-label">Year</div>
            <select className="filter-select" value={search.year || ""} onChange={(e) => set({ year: e.target.value })}>
              <option value="">All years</option>
              {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <div className="filter-field-label">Sort By</div>
            <select className="filter-select" value={search.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>

          <div>
            <div className="filter-field-label">Topics (multi-select)</div>
            <div className="multi-topic-list">
              {allTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={"multi-topic-pill" + (search.topic === t ? " selected" : "")}
                  onClick={() => set({ topic: search.topic === t ? "" : t })}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="section-row-header">
        <div className="section-title-wrap">
          <h2 className="section-title" style={{ fontSize: 22 }}>Search Results</h2>
          <span className="section-count-badge">
            {String(results.length).padStart(2, "0")} {results.length === 1 ? "paper" : "papers"}
          </span>
        </div>
        {search.query && (
          <span className="muted small">
            Keyword: "<strong>{search.query}</strong>"
          </span>
        )}
      </div>

      {results.length ? (
        <div className="papers-grid">
          {results.map((p) => (
            <PaperCard key={p.id} paper={p} ctx={ctx} highlightQuery={search.query} />
          ))}
        </div>
      ) : (
        <NoResults query={search.query || "your query"} onReset={handleReset} />
      )}
    </div>
  );
}

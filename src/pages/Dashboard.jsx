import { useState, useMemo, useEffect } from "react";
import { SlidersHorizontal, Filter, ArrowUpRight } from "lucide-react";
import SearchBar from "../components/SearchBar.jsx";
import TopicChips from "../components/TopicChips.jsx";
import PaperCard from "../components/PaperCard.jsx";
import { papers, allTopics, allYears, categories } from "../data/papers.js";

const FILTER_TOPICS = ["All topics", "Cancer Research", "NLP", "Machine learning", "Healthcare", "Computer Vision", "Semantic Search"];

// Build autocomplete suggestions from paper titles + topics
function buildSuggestions(query, paperList, topicList) {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase();
  const results = [];
  // Topic matches
  topicList.forEach((t) => {
    if (t.toLowerCase().includes(q)) results.push({ text: t, type: "topic" });
  });
  // Paper title matches
  paperList.forEach((p) => {
    if (p.title.toLowerCase().includes(q)) results.push({ text: p.title, type: "paper" });
  });
  return results.slice(0, 8);
}

// Skeleton card placeholder
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line w-1/3 h-4" />
      <div className="skeleton-line w-full h-6" />
      <div className="skeleton-line w-3/4 h-4" />
      <div className="skeleton-line w-full" />
      <div className="skeleton-line w-full" />
      <div className="skeleton-line w-1/2" />
    </div>
  );
}

export default function Dashboard({ ctx }) {
  const [q, setQ] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All topics");
  const [selectedYear, setSelectedYear] = useState("");
  const [sortOrder, setSortOrder] = useState("relevance");
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simulate brief skeleton loading on mount
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Autocomplete suggestions
  const suggestions = useMemo(() => buildSuggestions(q, papers, allTopics), [q]);

  // Filter papers
  const filteredPapers = useMemo(() => {
    let list = [...papers];
    if (selectedTopic !== "All topics") {
      const target = selectedTopic.toLowerCase();
      list = list.filter((p) =>
        p.topics.some((t) => t.toLowerCase() === target || t.toLowerCase().includes(target))
      );
    }
    if (selectedYear) {
      list = list.filter((p) => String(p.year) === String(selectedYear));
    }
    if (sortOrder === "newest") {
      list.sort((a, b) => b.year - a.year);
    } else if (sortOrder === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => b.year - a.year);
    }
    return list;
  }, [selectedTopic, selectedYear, sortOrder]);

  const displayedPapers = filteredPapers.slice(0, 8);

  const handleTopicClick = (topic) => {
    setSelectedTopic(topic);
  };

  const handleSearchSubmit = (overrideQ) => {
    const query = overrideQ ?? q;
    if (query.trim()) {
      ctx.runSearch(query);
    }
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "relevance" ? "newest" : prev === "newest" ? "title" : "relevance"));
  };

  // Recently viewed papers
  const recentPapers = (ctx.recentlyViewed || [])
    .map((id) => papers.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div>
      {/* Editorial Hero Section */}
      <section className="hero-editorial">
        <div className="hero-editorial-left">
          <div className="eyebrow">RESEARCH PAPER RECOMMENDATION</div>
          <h1 className="hero-title">
            Find the thread<br />
            in the literature.
          </h1>
          <p className="hero-description">
            An NLP-based approach to turning a research question into a focused reading list.
          </p>
        </div>
      </section>

      {/* Discovery Workspace Search Panel */}
      <section className="search-workspace-card" aria-label="Discovery Workspace">
        <div className="search-workspace-header" style={{ marginBottom: 12 }}>
          <span className="eyebrow-neutral">DISCOVERY WORKSPACE</span>
        </div>

        <h2 className="search-workspace-title">What are you researching?</h2>

        <SearchBar
          large
          value={q}
          onChange={setQ}
          onSubmit={handleSearchSubmit}
          onClear={() => setQ("")}
          placeholder="Search by topic, methodology, keywords, or title..."
          buttonLabel="Find papers"
          suggestions={suggestions}
        />
      </section>

      {/* Recently Viewed */}
      {recentPapers.length > 0 && (
        <section className="section" style={{ marginTop: 0, marginBottom: 28 }}>
          <div className="section-row-header">
            <div className="section-title-wrap">
              <h2 className="section-title" style={{ fontSize: 18 }}>Continue Reading</h2>
              <span className="section-count-badge">{String(recentPapers.length).padStart(2, "0")}</span>
            </div>
          </div>
          <div className="recently-viewed-grid">
            {recentPapers.map((paper, i) => (
              <button
                key={paper.id}
                type="button"
                className="recently-viewed-card"
                onClick={() => ctx.openPaper(paper.id)}
              >
                <span className="recently-viewed-num">{String(i + 1).padStart(2, "0")}</span>
                <div className="recently-viewed-body">
                  <div className="recently-viewed-title">{paper.title}</div>
                  <div className="recently-viewed-meta">{paper.category} · {paper.year}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Papers Section */}
      <section className="section" style={{ marginTop: 28 }}>
        <div className="section-row-header">
          <div className="section-title-wrap">
            <h2 className="section-title">Recommended papers</h2>
            <span className="section-count-badge">
              {String(displayedPapers.length).padStart(2, "0")}
            </span>
          </div>

          <div className="section-controls">
            <button
              type="button"
              className="control-btn"
              onClick={toggleSort}
              title={`Sort by: ${sortOrder}`}
            >
              <SlidersHorizontal size={14} strokeWidth={1.8} />
              <span style={{ textTransform: "capitalize" }}>{sortOrder}</span>
            </button>

            <button
              type="button"
              className={"control-btn" + (showFilterOptions ? " active" : "")}
              onClick={() => setShowFilterOptions((prev) => !prev)}
              title="Toggle filter drawer"
            >
              <Filter size={14} strokeWidth={1.8} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Topic Filter Pills */}
        <div className="chips-row">
          {FILTER_TOPICS.map((topic) => {
            const isActive = selectedTopic === topic;
            return (
              <button
                key={topic}
                type="button"
                className={"topic-pill" + (isActive ? " active" : "")}
                onClick={() => handleTopicClick(topic)}
              >
                {topic}
              </button>
            );
          })}
        </div>

        {showFilterOptions && (
          <div className="filters-bar" style={{ marginTop: -10, marginBottom: 24 }}>
            <div className="filter-group">
              <label>Broad Category</label>
              <select
                className="filter-select"
                value={ctx.search.category}
                onChange={(e) => ctx.runSearch(q, { category: e.target.value })}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Publication Year</label>
              <select
                className="filter-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">All Years</option>
                {allYears.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Sort Metric</label>
              <select
                className="filter-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="relevance">Relevance Overlap</option>
                <option value="newest">Publication Date (Newest)</option>
                <option value="title">Alphabetical Title</option>
              </select>
            </div>
            <button
              type="button"
              className="control-btn"
              style={{ alignSelf: "flex-end", height: 38 }}
              onClick={() => {
                setSelectedTopic("All topics");
                setSelectedYear("");
                setSortOrder("relevance");
              }}
            >
              Reset
            </button>
          </div>
        )}

        {/* Papers Grid — skeleton or real */}
        {loading ? (
          <div className="papers-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="papers-grid">
            {displayedPapers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} ctx={ctx} />
            ))}
          </div>
        )}

        {/* Bottom Floating/Dock Card: "THE METHOD ↗" */}
        <div className="the-method-dock">
          <button
            type="button"
            className="the-method-card"
            onClick={() => ctx.go("recommendations")}
            title="Inspect Algorithmic Methodology"
          >
            <span className="the-method-label">THE METHOD</span>
            <ArrowUpRight size={15} strokeWidth={2} color="var(--accent)" />
          </button>
        </div>
      </section>

      {/* Curated Research Topics Section */}
      <section className="section" style={{ marginTop: 44, borderTop: "1px solid var(--border)", paddingTop: 30 }}>
        <div className="section-row-header">
          <div className="section-title-wrap">
            <h3 className="section-title">Explore Research Domains</h3>
            <span className="section-count-badge">{allTopics.length}</span>
          </div>
        </div>
        <TopicChips
          items={allTopics}
          onSelect={(t) => ctx.runSearch(t)}
        />
      </section>

      {/* Recent Searches */}
      {ctx.history.length > 0 && (
        <section className="section" style={{ marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 26 }}>
          <div className="section-row-header">
            <div className="section-title-wrap">
              <h3 className="section-title">Recent Workspace Queries</h3>
              <span className="section-count-badge">{ctx.history.length}</span>
            </div>
          </div>
          <TopicChips
            items={ctx.history.slice(0, 8).map((h) => h.q)}
            onSelect={(t) => ctx.runSearch(t)}
          />
        </section>
      )}
    </div>
  );
}

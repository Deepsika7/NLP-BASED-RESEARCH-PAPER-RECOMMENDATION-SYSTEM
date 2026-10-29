import { useEffect, useState } from "react";
import PaperCard from "../components/PaperCard.jsx";
import TopicChips from "../components/TopicChips.jsx";
import SkeletonCard from "../components/SkeletonCard.jsx";
import { api } from "../api.js";
import { allTopics } from "../data/papers.js";

export default function Recommendations({ ctx }) {
  const [interests, setInterests] = useState([]);
  const toggle = (t) =>
    setInterests((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  // Ranking happens on the server from interests + saved papers + recent searches.
  const [recs, setRecs] = useState(null); // null = loading
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      api.recommendations(interests)
        .then((r) => live && setRecs(r))
        .catch(() => live && setRecs({ personalised: false, list: [] }));
    }, 150);
    return () => { live = false; clearTimeout(t); };
  }, [interests, ctx.syncVersion]);
  const view = recs || { personalised: false, list: [] };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Method & Recommendations</h1>
        <p className="page-subtitle">
          Select research interests below to steer literature recommendations based on topic affinity and reading history.
        </p>
      </div>

      {/* Interactive Interests Selector */}
      <section className="section" style={{ marginTop: 12 }}>
        <div className="section-row-header">
          <div className="section-title-wrap">
            <h3 className="section-title" style={{ fontSize: 22 }}>
              Your Research Interests
            </h3>
            <span className="section-count-badge">{interests.length} selected</span>
          </div>
          {interests.length > 0 && (
            <button
              type="button"
              className="control-btn"
              onClick={() => setInterests([])}
            >
              Clear Interests
            </button>
          )}
        </div>
        <p className="muted small" style={{ marginTop: -8, marginBottom: 14 }}>
          Select domain topics to steer recommendations and calculate dynamic affinity scores.
        </p>
        <TopicChips
          items={allTopics}
          onSelect={toggle}
          activeItems={interests}
        />
      </section>

      {/* Recommendations Results Grid */}
      <section className="section" style={{ marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
        <div className="section-row-header">
          <div className="section-title-wrap">
            <h3 className="section-title">
              {view.personalised ? "Tailored Recommendations" : "Curated Literature Picks"}
            </h3>
            <span className="section-count-badge">
              {String(view.list.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {!recs ? (
          <div className="papers-grid">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : view.list.length ? (
          <div className="papers-grid">
            {view.list.map(({ paper, why }) => (
              <PaperCard key={paper.id} paper={paper} ctx={ctx} why={why} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No matching literature found</h3>
            <p>Try selecting other interest topics above or browse the search index.</p>
          </div>
        )}
      </section>
    </div>
  );
}

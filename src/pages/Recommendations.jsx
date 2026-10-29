import { useMemo, useState } from "react";
import PaperCard from "../components/PaperCard.jsx";
import TopicChips from "../components/TopicChips.jsx";
import { papers, allTopics, getPaper, expandTokens, scorePaper } from "../data/papers.js";

export default function Recommendations({ ctx }) {
  const [interests, setInterests] = useState([]);
  const toggle = (t) =>
    setInterests((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const recs = useMemo(() => {
    const savedPapers = ctx.saved.map(getPaper).filter(Boolean);
    const savedTopics = new Set(savedPapers.flatMap((p) => p.topics));
    const tokens = expandTokens(ctx.history.slice(0, 5).map((h) => h.q).join(" "));
    const hasSignal = interests.length || savedTopics.size || tokens.length;

    if (!hasSignal) {
      return {
        personalised: false,
        list: [...papers]
          .sort((a, b) => b.year - a.year)
          .slice(0, 8)
          .map((p) => ({
            paper: p,
            why: "Recent publication. Choose interest topics below or save papers to tailor this list.",
          })),
      };
    }

    const list = papers
      .filter((p) => !ctx.saved.includes(p.id))
      .map((p) => {
        const byInterest = p.topics.filter((t) => interests.includes(t));
        const bySaved = p.topics.filter((t) => savedTopics.has(t));
        const { matched } = scorePaper(p, tokens);
        const parts = [];
        if (byInterest.length)
          parts.push("matches your interests (" + byInterest.join(", ") + ")");
        if (bySaved.length)
          parts.push("shares topics with saved papers (" + bySaved.join(", ") + ")");
        if (matched.length)
          parts.push("matches recent query terms (" + matched.join(", ") + ")");
        const score = byInterest.length * 3 + bySaved.length * 2 + matched.length;
        return {
          paper: p,
          score,
          why: parts.length ? parts.join("; ") : "",
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return { personalised: true, list };
  }, [ctx.saved, ctx.history, interests]);

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
              {recs.personalised ? "Tailored Recommendations" : "Curated Literature Picks"}
            </h3>
            <span className="section-count-badge">
              {String(recs.list.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {recs.list.length ? (
          <div className="papers-grid">
            {recs.list.map(({ paper, why }) => (
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

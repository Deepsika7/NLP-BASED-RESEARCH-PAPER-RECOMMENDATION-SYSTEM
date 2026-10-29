// Client-side paper catalog. The data itself lives in the backend (SQLite) and is loaded
// once at startup via GET /api/bootstrap; search, ranking, citations, comparison and
// recommendations are all computed server-side.
export const papers = [];
export const categories = [];
export const allTopics = [];
export const allYears = [];
export const exampleQueries = [];

// Arrays are mutated in place so existing `import { papers }` bindings stay valid.
export function hydrateCatalog(b) {
  papers.splice(0, papers.length, ...b.papers);
  categories.splice(0, categories.length, ...b.categories);
  allTopics.splice(0, allTopics.length, ...b.topics);
  allYears.splice(0, allYears.length, ...b.years);
  exampleQueries.splice(0, exampleQueries.length, ...(b.exampleQueries || []));
}

export function getPaper(id) {
  return papers.find((p) => p.id === Number(id));
}

export function readingTime(paper) {
  if (paper.readingTime) return paper.readingTime;
  const words = (paper.abstract || "").split(/\s+/).length;
  return `~${Math.max(1, Math.round(words / 200))} min read`;
}

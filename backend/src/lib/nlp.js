"use strict";
/**
 * Lexical NLP engine: query expansion (domain aliases), light stemming and
 * multi-field weighted scoring. Mirrors the behaviour the UI was designed around.
 */

const STOP = new Set(("a about above after again against all am an and any are aren't as at be because been before being below between both but by " +
  "can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having " +
  "he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most " +
  "mustn't my myself no nor not of off on once only or ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some " +
  "such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under " +
  "until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't " +
  "would wouldn't you you'd you'll you're you've your yours yourself yourselves paper study approach method").split(" "));

const CARCINO = ["cancer", "oncology", "tumor", "carcinogenesis", "malignant", "carcinoma", "neoplasm", "mutagenesis", "dna adducts"];
const ALIASES = {
  carcinogen: CARCINO,
  carcinogens: CARCINO,
  carcinogenic: ["cancer", "oncology", "tumor", "carcinogenesis", "carcinogen", "malignant"],
  carcinogenesis: ["cancer", "oncology", "tumor", "carcinogen", "carcinoma", "malignancy", "mutagenesis"],
  cancer: ["carcinogen", "carcinogens", "carcinogenesis", "oncology", "tumor", "carcinoma", "neoplasm", "malignancy"],
  oncology: ["cancer", "tumor", "carcinogen", "carcinogenesis", "carcinoma", "immunotherapy"],
  tumor: ["cancer", "oncology", "carcinogen", "carcinogenesis", "carcinoma", "malignant"],
  tumors: ["cancer", "oncology", "carcinogen", "carcinogenesis", "carcinoma", "malignant"],
  nlp: ["natural", "language", "processing"],
  ml: ["machine", "learning"],
  rag: ["retrieval", "augmented", "generation"],
  cv: ["computer", "vision"],
  llm: ["large", "language", "model", "transformer"],
  gnn: ["graph", "neural", "network"],
  cnn: ["convolutional", "neural", "network"],
  rl: ["reinforcement", "learning"],
  ehr: ["electronic", "health", "records"],
};

const toLemma = (word) => {
  const w = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";

  const irregular = {
    are: "be", was: "be", were: "be", being: "be", been: "be",
    models: "model", model: "model", learning: "learn", learned: "learn", learns: "learn",
    images: "image", image: "image", diagnosis: "diagnosis", diagnoses: "diagnosis",
    papers: "paper", papers: "paper", categories: "category", topics: "topic",
    methods: "method", studies: "study", approaches: "approach", networks: "network",
    neurons: "neuron", layers: "layer", features: "feature", datasets: "dataset",
    diseases: "disease", patients: "patient", clinical: "clinical",
  };
  if (irregular[w]) return irregular[w];

  let x = w;
  if (x.endsWith("ies") && x.length > 4) x = x.slice(0, -3) + "y";
  else if (x.endsWith("sses") && x.length > 4) x = x.slice(0, -2);
  else if (x.endsWith("es") && x.length > 4 && !["ses", "xes", "zes", "ches", "shes"].includes(x.slice(-3))) x = x.slice(0, -2);
  else if (x.endsWith("s") && x.length > 3 && !x.endsWith("ss")) x = x.slice(0, -1);
  if (x.endsWith("ing") && x.length > 5) x = x.slice(0, -3);
  if (x.endsWith("al") && x.length > 5) x = x.slice(0, -2);
  if (x.endsWith("ed") && x.length > 4) x = x.slice(0, -2);
  if (x.endsWith("ly") && x.length > 4) x = x.slice(0, -2);
  if (x.endsWith("er") && x.length > 5) x = x.slice(0, -2);
  if (x.endsWith("est") && x.length > 5) x = x.slice(0, -2);

  return x;
};

const stem = (w) => toLemma(w);
const words = (s) => (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem);

function preprocessText(text) {
  const tokens = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => toLemma(token))
    .filter((token) => token && token.length > 1 && !STOP.has(token));

  return tokens;
}

function expandTokens(query) {
  const raw = preprocessText(query);
  const out = raw.flatMap((t) => (ALIASES[t] ? [t, ...ALIASES[t]] : [t]));
  return [...new Set(out.map(stem))];
}

// Pre-tokenise each paper once (papers are cached in memory by the store).
const fieldCache = new WeakMap();
function fields(p) {
  let f = fieldCache.get(p);
  if (!f) {
    f = [
      [words(p.title), 4],
      [words(p.keywords.join(" ")), 3],
      [words(p.topics.join(" ")), 3],
      [words(p.category), 2],
      [words(p.abstract), 1],
    ];
    fieldCache.set(p, f);
  }
  return f;
}

function scorePaper(p, tokens) {
  let score = 0;
  const matched = [];
  for (const t of tokens) {
    let hit = false;
    for (const [ws, weight] of fields(p)) {
      if (ws.some((w) => w === t || (t.length >= 3 && w.startsWith(t)))) {
        score += weight;
        hit = true;
      }
    }
    if (hit) matched.push(t);
  }
  return { score, matched };
}

function buildTfIdf(query, documents) {
  const docTexts = documents.map((doc) => {
    const text = [doc.title, doc.abstract, doc.keywords?.join(" ") || "", doc.topics?.join(" ") || "", doc.category || ""].join(" ");
    return { doc, tokens: preprocessText(text) };
  });

  const vocab = new Set();
  for (const entry of docTexts) {
    for (const token of entry.tokens) vocab.add(token);
  }

  const queryTokens = preprocessText(query);
  const queryCounts = new Map();
  for (const token of queryTokens) queryCounts.set(token, (queryCounts.get(token) || 0) + 1);

  const docFreq = new Map();
  for (const token of vocab) docFreq.set(token, 0);
  for (const entry of docTexts) {
    const seen = new Set();
    for (const token of entry.tokens) {
      if (!seen.has(token)) {
        seen.add(token);
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }
  }

  const idf = new Map();
  for (const token of vocab) {
    const df = docFreq.get(token) || 1;
    idf.set(token, Math.log((docTexts.length + 1) / (df + 1)) + 1);
  }

  const qVec = new Map();
  const qNorm = queryTokens.length || 1;
  for (const token of queryTokens) {
    const tf = (queryCounts.get(token) || 0) / qNorm;
    const weight = tf * (idf.get(token) || 1);
    qVec.set(token, weight);
  }

  const vectors = docTexts.map(({ doc, tokens }) => {
    const counts = new Map();
    for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
    const vec = new Map();
    const norm = tokens.length || 1;
    for (const [token, count] of counts.entries()) {
      vec.set(token, (count / norm) * (idf.get(token) || 1));
    }
    return { doc, vec };
  });

  return { qVec, vectors, vocab: [...vocab] };
}

function cosineSimilarity(queryVec, docVec) {
  let numerator = 0;
  let qNorm = 0;
  let dNorm = 0;

  for (const [term, qWeight] of queryVec.entries()) {
    qNorm += qWeight * qWeight;
    if (docVec.has(term)) numerator += qWeight * (docVec.get(term) || 0);
  }

  for (const weight of docVec.values()) dNorm += weight * weight;
  const denom = Math.sqrt(qNorm) * Math.sqrt(dNorm || 1);
  if (!denom) return 0;
  return numerator / denom;
}

function rankByTfIdf(query, documents, limit = 5) {
  const cleaned = (query || "").trim();
  if (!cleaned || !documents.length) return [];

  const { qVec, vectors } = buildTfIdf(cleaned, documents);
  const ranked = vectors
    .map(({ doc, vec }) => ({ paper: doc, score: cosineSimilarity(qVec, vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));

  return ranked;
}

const SORTS = {
  relevance: (a, b) => b.score - a.score || b.p.year - a.p.year,
  newest: (a, b) => b.p.year - a.p.year,
  oldest: (a, b) => a.p.year - b.p.year,
  title: (a, b) => a.p.title.localeCompare(b.p.title),
};

/** topicMatch: "exact" (search page) | "contains" (dashboard pills, e.g. "NLP"-style partials) */
function searchPapers(list, { query, category, topic, year, sort, topicMatch = "exact" }) {
  const tokens = expandTokens(query);
  const tl = (topic || "").toLowerCase();
  let rows = list
    .filter((p) => !category || p.category === category)
    .filter((p) => !topic || (topicMatch === "contains"
      ? p.topics.some((t) => t.toLowerCase().includes(tl))
      : p.topics.includes(topic)))
    .filter((p) => !year || String(p.year) === String(year))
    .map((p) => ({ p, ...scorePaper(p, tokens) }));

  if (tokens.length) {
    const tfidfMap = new Map(
      rankByTfIdf(query, rows.map((r) => r.p), rows.length).map((r) => [r.paper.id, r.score])
    );
    rows = rows
      .map((r) => ({ ...r, score: r.score + (tfidfMap.get(r.p.id) || 0) * 20 }))
      .filter((r) => r.score > 0);
  }

  return rows.sort(SORTS[sort] || SORTS.relevance).map((r) => r.p);
}

const lower = (arr) => arr.map((x) => x.toLowerCase());
function relatedPapers(list, paper, n = 3) {
  const t = lower(paper.topics);
  const k = lower(paper.keywords);
  return list
    .filter((p) => p.id !== paper.id)
    .map((p) => {
      const st = lower(p.topics).filter((x) => t.includes(x));
      const sk = lower(p.keywords).filter((x) => k.includes(x));
      return { p, score: st.length * 2 + sk.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.p.year - a.p.year)
    .slice(0, n)
    .map((r) => r.p);
}

function commonTopics(list) {
  if (list.length < 2) return [];
  return list[0].topics.filter((t) => list.every((p) => p.topics.includes(t)));
}

function uniqueTopics(list) {
  const out = {};
  list.forEach((p) => {
    out[p.id] = p.topics.filter((t) => list.every((q) => q.id === p.id || !q.topics.includes(t)));
  });
  return out;
}

function suggest(list, topics, query, max = 8) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const out = [];
  topics.forEach((t) => { if (t.toLowerCase().includes(q)) out.push({ text: t, type: "topic" }); });
  list.forEach((p) => { if (p.title.toLowerCase().includes(q)) out.push({ text: p.title, type: "paper" }); });
  return out.slice(0, max);
}

/**
 * Personalised recommendations from three signals:
 *   explicit interests (x3), topics of saved papers (x2), terms from recent queries (x1).
 */
function recommend(list, { interests = [], savedIds = [], recentQueries = [], limit = 8 }) {
  const byId = new Map(list.map((p) => [p.id, p]));
  const savedPapers = savedIds.map((id) => byId.get(id)).filter(Boolean);
  const savedTopics = new Set(savedPapers.flatMap((p) => p.topics));
  const tokens = expandTokens(recentQueries.slice(0, 5).join(" "));
  const hasSignal = interests.length || savedTopics.size || tokens.length;

  if (!hasSignal) {
    return {
      personalised: false,
      list: [...list].sort((a, b) => b.year - a.year || a.id - b.id).slice(0, limit).map((p) => ({
        paper: p,
        score: 0,
        why: "Recent publication. Choose interest topics below or save papers to tailor this list.",
      })),
    };
  }

  const saved = new Set(savedIds);
  const ranked = list
    .filter((p) => !saved.has(p.id))
    .map((p) => {
      const byInterest = p.topics.filter((t) => interests.includes(t));
      const bySaved = p.topics.filter((t) => savedTopics.has(t));
      const { matched } = scorePaper(p, tokens);
      const parts = [];
      if (byInterest.length) parts.push("matches your interests (" + byInterest.join(", ") + ")");
      if (bySaved.length) parts.push("shares topics with saved papers (" + bySaved.join(", ") + ")");
      if (matched.length) parts.push("matches recent query terms (" + matched.join(", ") + ")");
      return {
        paper: p,
        score: byInterest.length * 3 + bySaved.length * 2 + matched.length,
        why: parts.join("; "),
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.paper.year - a.paper.year)
    .slice(0, limit);

  return { personalised: true, list: ranked };
}

function readingTime(paper) {
  const n = (paper.abstract || "").split(/\s+/).length;
  return `~${Math.max(1, Math.round(n / 200))} min read`;
}

module.exports = {
  preprocessText,
  expandTokens,
  scorePaper,
  buildTfIdf,
  cosineSimilarity,
  rankByTfIdf,
  searchPapers,
  relatedPapers,
  commonTopics,
  uniqueTopics,
  suggest,
  recommend,
  readingTime,
};

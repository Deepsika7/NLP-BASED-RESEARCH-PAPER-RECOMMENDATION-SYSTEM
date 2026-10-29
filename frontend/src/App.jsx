import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import CompareBar from "./components/CompareBar.jsx";
import PaperDetails from "./components/PaperDetails.jsx";
import CiteModal from "./components/CiteModal.jsx";
import ReadingProgress from "./components/ReadingProgress.jsx";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal.jsx";
import Confetti from "./components/Confetti.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SearchPapers from "./pages/SearchPapers.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import ComparePapers from "./pages/ComparePapers.jsx";
import SavedPapers from "./pages/SavedPapers.jsx";
import SearchHistory from "./pages/SearchHistory.jsx";
import { getPaper, hydrateCatalog } from "./data/papers.js";
import { api } from "./api.js";

const TITLES = {
  dashboard: "Discovery",
  search: "Search Papers",
  recommendations: "Method",
  compare: "Compare Papers",
  saved: "Project note",
  history: "Search History",
  details: "Paper Details",
};

// One-time import of data an earlier (frontend-only) version kept in localStorage.
async function migrateLegacyData(server) {
  try {
    if (localStorage.getItem("rai_migrated")) return false;
    const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
    const valid = new Set(server.papers.map((p) => p.id));
    const saved = read("rai_saved", []).filter((id) => valid.has(id));
    const notes = read("rai_notes", {});
    const tags = read("rai_tags", {});
    const history = read("rai_history", []);
    if (saved.length && !server.state.saved.length) {
      for (const id of saved) await api.save(id);
      for (const [id, tag] of Object.entries(tags)) if (tag && saved.includes(Number(id))) await api.setTag(id, tag);
    }
    if (!Object.keys(server.state.notes).length) {
      for (const [id, text] of Object.entries(notes)) if (valid.has(Number(id))) await api.setNote(id, text);
    }
    if (!server.state.history.length) {
      for (const h of [...history].reverse()) await api.addHistory(h.q);
    }
    localStorage.setItem("rai_migrated", "1");
    return true;
  } catch { return false; /* best effort */ }
}

const DEFAULT_SEARCH = { query: "", category: "", topic: "", year: "", sort: "relevance" };

export default function App() {
  const [boot, setBoot] = useState({ status: "loading", error: "" });
  const [view, setView] = useState({ page: "dashboard" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [citePaper, setCitePaper] = useState(null);
  const [saved, setSaved] = useState([]);
  const [tags, setTags] = useState({});
  const [history, setHistory] = useState([]);
  const [compare, setCompare] = useState([]);
  const [notes, setNotes] = useState({});
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [syncVersion, setSyncVersion] = useState(0); // bumps after each server write (re-ranks recommendations)
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [notice, setNotice] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const timer = useRef(null);

  const flash = (msg) => {
    setNotice(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 3500);
  };

  const applyState = (st) => {
    setSaved(st.saved); setTags(st.tags); setNotes(st.notes);
    setHistory(st.history); setRecentlyViewed(st.recent); setCompare(st.compare);
  };

  const load = async () => {
    setBoot({ status: "loading", error: "" });
    try {
      let data = await api.bootstrap();
      if (!data.state) data = { ...data, state: await api.state() };
      if (await migrateLegacyData(data)) data = { ...data, state: await api.state() };
      hydrateCatalog(data);
      applyState(data.state);
      setBoot({ status: "ready", error: "" });
    } catch (e) {
      setBoot({ status: "error", error: e.message || "Could not reach the server" });
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Server write with optimistic UI: on failure, re-sync from the server and tell the user.
  const resync = () => api.state().then(applyState).catch(() => {});
  const synced = (promise, onOk) =>
    promise
      .then((r) => { onOk?.(r); setSyncVersion((v) => v + 1); })
      .catch((e) => {
        if (e.status === 409) { if (e.data?.compare) setCompare(e.data.compare); flash(e.message); return; }
        flash("Couldn't sync with the server. Showing latest saved data.");
        resync();
      });

  const go = (page) => {
    setView({ page });
    setMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const openPaper = (id) => {
    setView((v) => ({
      page: "details",
      paperId: id,
      from: v.page === "details" ? v.from : v.page,
    }));
    setRecentlyViewed((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 6));
    synced(api.recordView(id), (r) => setRecentlyViewed(r.recent));
    window.scrollTo(0, 0);
  };

  const toggleSave = (id) => {
    const exists = saved.includes(id);
    flash(exists ? "Removed from reading list" : "Saved to project note");
    if (exists) {
      setSaved((s) => s.filter((x) => x !== id));
      setTags((t) => { const c = { ...t }; delete c[id]; return c; });
      synced(api.unsave(id), (r) => setSaved(r.saved));
    } else {
      setSaved((s) => [...s, id]);
      synced(api.save(id), (r) => { setSaved(r.saved); if (r.firstSave) setConfettiActive(true); });
    }
  };

  const setTag = (id, tag) => {
    const next = tags[id] === tag ? null : tag;
    setTags((t) => { const c = { ...t }; if (next) c[id] = next; else delete c[id]; return c; });
    synced(api.setTag(id, next), (r) => setTags(r.tags));
  };

  const toggleCompare = (id) => {
    if (compare.includes(id)) {
      setCompare(compare.filter((x) => x !== id));
      synced(api.removeCompare(id), (r) => setCompare(r.compare));
      flash("Removed from comparison");
    } else if (compare.length >= 4) {
      flash("Comparison limit reached: up to 4 papers allowed.");
    } else {
      setCompare([...compare, id]);
      synced(api.addCompare(id), (r) => setCompare(r.compare));
      flash("Added to comparison matrix");
    }
  };

  const setNote = (id, text) => {
    setNotes((prev) => {
      const copy = { ...prev };
      if (!text.trim()) { delete copy[id]; } else { copy[id] = text.trim(); }
      return copy;
    });
    synced(api.setNote(id, text), (r) => setNotes(r.notes));
    flash("Personal note saved");
  };

  const addHistory = (q) => {
    const text = (q || "").trim();
    if (!text) return;
    setHistory((h) =>
      [{ q: text, t: Date.now() }, ...h.filter((x) => x.q.toLowerCase() !== text.toLowerCase())].slice(0, 20)
    );
    synced(api.addHistory(text), (r) => setHistory(r.history));
  };

  const commitSearch = (q, extra = {}) => {
    addHistory(q);
    setSearch((s) => ({ ...s, query: q.trim(), ...extra }));
  };

  const runSearch = (q, extra = {}) => {
    commitSearch(q, extra);
    go("search");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const inInput = tag === "input" || tag === "textarea" || tag === "select";
      if (e.key === "?" && !inInput) {
        setShortcutsOpen((p) => !p);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        go("search");
        return;
      }
      if (e.key === "Escape") {
        setShortcutsOpen(false);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const ctx = {
    view,
    go,
    openPaper,
    saved,
    toggleSave,
    compare,
    toggleCompare,
    removeCompare: (id) => { setCompare(compare.filter((x) => x !== id)); synced(api.removeCompare(id), (r) => setCompare(r.compare)); },
    clearCompare: () => { setCompare([]); synced(api.clearCompare()); flash("Comparison cleared"); },
    notes,
    tags,
    setTag,
    syncVersion,
    flash,
    setNote,
    history,
    clearHistory: () => { setHistory([]); synced(api.clearHistory()); flash("Search history cleared"); },
    recentlyViewed,
    search,
    setSearch,
    resetSearch: () => setSearch(DEFAULT_SEARCH),
    commitSearch,
    runSearch,
    openCite: (paper) => setCitePaper(paper),
  };

  if (boot.status !== "ready") {
    return (
      <div className="app">
        <div className="empty-state" style={{ margin: "20vh auto 0", maxWidth: 480 }}>
          {boot.status === "loading" ? (
            <>
              <h3>Loading research index…</h3>
              <p>Connecting to the server.</p>
            </>
          ) : (
            <>
              <h3>Can't reach the server</h3>
              <p>{boot.error}. Make sure the backend is running (<code>npm run dev</code> from the project root).</p>
              <button type="button" className="btn-rust" onClick={load}><span>Retry</span></button>
            </>
          )}
        </div>
      </div>
    );
  }

  let page;
  switch (view.page) {
    case "search":       page = <SearchPapers ctx={ctx} />; break;
    case "recommendations": page = <Recommendations ctx={ctx} />; break;
    case "compare":      page = <ComparePapers ctx={ctx} />; break;
    case "saved":        page = <SavedPapers ctx={ctx} />; break;
    case "history":      page = <SearchHistory ctx={ctx} />; break;
    case "details": {
      const paper = getPaper(view.paperId);
      page = paper ? <PaperDetails paper={paper} ctx={ctx} /> : <Dashboard ctx={ctx} />;
      break;
    }
    default: page = <Dashboard ctx={ctx} />;
  }

  const activePage = view.page === "details" ? view.from || "search" : view.page;

  return (
    <div className="app">
      {/* Reading progress bar */}
      <ReadingProgress />

      {/* Confetti on first save */}
      <Confetti active={confettiActive} onDone={() => setConfettiActive(false)} />

      {/* Slide-out mobile drawer */}
      <Sidebar ctx={ctx} active={activePage} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="app-body">
        <Header title={TITLES[view.page]} ctx={ctx} onMenu={() => setMenuOpen(true)} />

        <main className="main-content">
          <div className="content-container">{page}</div>
        </main>
      </div>

      {/* Floating comparison tray */}
      {view.page !== "compare" && <CompareBar ctx={ctx} />}

      {/* Citation Generator Dialog */}
      <CiteModal paper={citePaper} open={Boolean(citePaper)} onClose={() => setCitePaper(null)} onCopy={flash} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Floating shortcuts hint */}
      <button
        type="button"
        className="shortcuts-hint"
        onClick={() => setShortcutsOpen(true)}
        title="View keyboard shortcuts"
        aria-label="Keyboard shortcuts"
      >
        <kbd className="kbd-key">?</kbd>
        <span>Shortcuts</span>
      </button>

      {/* Toast notifications */}
      {notice && <div className="toast" role="alert">{notice}</div>}
    </div>
  );
}

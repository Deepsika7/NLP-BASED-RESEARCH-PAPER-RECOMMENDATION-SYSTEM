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
import { getPaper } from "./data/papers.js";

const TITLES = {
  dashboard: "Discovery",
  search: "Search Papers",
  recommendations: "Method",
  compare: "Compare Papers",
  saved: "Project note",
  history: "Search History",
  details: "Paper Details",
};

function useStored(key, init, storage = "local") {
  const [value, setValue] = useState(() => {
    try {
      const raw = window[storage + "Storage"].getItem(key);
      return raw ? JSON.parse(raw) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try {
      window[storage + "Storage"].setItem(key, JSON.stringify(value));
    } catch { /* storage unavailable – ignore */ }
  }, [key, value, storage]);
  return [value, setValue];
}

const DEFAULT_SEARCH = { query: "", category: "", topic: "", year: "", sort: "relevance" };

export default function App() {
  const [view, setView] = useState({ page: "dashboard" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [citePaper, setCitePaper] = useState(null);
  const [saved, setSaved] = useStored("rai_saved", []);
  const [history, setHistory] = useStored("rai_history", []);
  const [compare, setCompare] = useStored("rai_compare", [], "session");
  const [notes, setNotes] = useStored("rai_notes", {});
  const [recentlyViewed, setRecentlyViewed] = useStored("rai_recent", []);
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [notice, setNotice] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const firstSaveRef = useRef(!localStorage.getItem("rai_first_save_done"));
  const timer = useRef(null);

  const flash = (msg) => {
    setNotice(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 3500);
  };

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
    // Track recently viewed
    setRecentlyViewed((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 6));
    window.scrollTo(0, 0);
  };

  const toggleSave = (id) => {
    setSaved((s) => {
      const exists = s.includes(id);
      flash(exists ? "Removed from reading list" : "Saved to project note");
      if (!exists && firstSaveRef.current) {
        firstSaveRef.current = false;
        localStorage.setItem("rai_first_save_done", "1");
        setConfettiActive(true);
      }
      return exists ? s.filter((x) => x !== id) : [...s, id];
    });
  };

  const toggleCompare = (id) => {
    if (compare.includes(id)) {
      setCompare(compare.filter((x) => x !== id));
      flash("Removed from comparison");
    } else if (compare.length >= 4) {
      flash("Comparison limit reached: up to 4 papers allowed.");
    } else {
      setCompare([...compare, id]);
      flash("Added to comparison matrix");
    }
  };

  const setNote = (id, text) => {
    setNotes((prev) => {
      const copy = { ...prev };
      if (!text.trim()) { delete copy[id]; } else { copy[id] = text.trim(); }
      return copy;
    });
    flash("Personal note saved");
  };

  const addHistory = (q) => {
    const text = (q || "").trim();
    if (!text) return;
    setHistory((h) =>
      [{ q: text, t: Date.now() }, ...h.filter((x) => x.q.toLowerCase() !== text.toLowerCase())].slice(0, 20)
    );
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
    removeCompare: (id) => setCompare(compare.filter((x) => x !== id)),
    clearCompare: () => { setCompare([]); flash("Comparison cleared"); },
    notes,
    setNote,
    history,
    clearHistory: () => { setHistory([]); flash("Search history cleared"); },
    recentlyViewed,
    search,
    setSearch,
    resetSearch: () => setSearch(DEFAULT_SEARCH),
    commitSearch,
    runSearch,
    openCite: (paper) => setCitePaper(paper),
  };

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

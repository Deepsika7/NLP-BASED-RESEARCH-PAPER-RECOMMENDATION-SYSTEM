import { BookOpen, Search, FlaskConical, Bookmark, GitCompare, History, Menu } from "lucide-react";

const BREADCRUMBS = {
  dashboard: "Discovery",
  search: "Search",
  recommendations: "Method",
  compare: "Compare",
  saved: "Project note",
  history: "Search History",
  details: "Paper Details",
};

export default function Header({ ctx, onMenu }) {
  const current = ctx.view.page;
  const isDiscover = current === "dashboard" || current === "search";

  return (
    <header>
      {/* Primary Top Navigation Bar */}
      <nav className="navbar" aria-label="Main Navigation">
        <div className="content-container">
          <button
            className="navbar-brand"
            onClick={() => ctx.go("dashboard")}
            aria-label="Research Index Home"
          >
            <span className="navbar-brand-logo">
              <BookOpen size={16} strokeWidth={1.75} />
            </span>
            <span className="navbar-brand-name">Research Index</span>
          </button>

          {/* Desktop Navigation Links */}
          <div className="navbar-links">
            <button
              className={"navbar-link" + (isDiscover ? " active" : "")}
              onClick={() => ctx.go("dashboard")}
            >
              <Search size={15} strokeWidth={1.8} />
              <span>Discover</span>
            </button>

            <button
              className={"navbar-link" + (current === "recommendations" ? " active" : "")}
              onClick={() => ctx.go("recommendations")}
            >
              <FlaskConical size={15} strokeWidth={1.8} />
              <span>Method</span>
            </button>

            <button
              className={"navbar-link" + (current === "compare" ? " active" : "")}
              onClick={() => ctx.go("compare")}
            >
              <GitCompare size={15} strokeWidth={1.8} />
              <span>Compare</span>
              {ctx.compare.length > 0 && (
                <span className="badge-count">{ctx.compare.length}</span>
              )}
            </button>

            <button
              className={"navbar-link" + (current === "saved" ? " active" : "")}
              onClick={() => ctx.go("saved")}
            >
              <Bookmark size={15} strokeWidth={1.8} />
              <span>Project note</span>
              {ctx.saved.length > 0 && (
                <span className="badge-count">{ctx.saved.length}</span>
              )}
            </button>

            <button
              className={"navbar-link" + (current === "history" ? " active" : "")}
              onClick={() => ctx.go("history")}
            >
              <History size={15} strokeWidth={1.8} />
              <span>History</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={onMenu}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Sub-Header Workspace Bar */}
      <div className="subbar">
        <div className="content-container">
          <div className="breadcrumbs">
            <span className="breadcrumb-root">Research workspace</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{BREADCRUMBS[current] || "Discovery"}</span>
          </div>

          <div className="subbar-right" />
        </div>
      </div>
    </header>
  );
}

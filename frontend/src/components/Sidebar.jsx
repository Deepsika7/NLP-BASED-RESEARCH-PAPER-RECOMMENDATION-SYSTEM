import {
  BookOpen,
  Search,
  FlaskConical,
  GitCompare,
  Bookmark,
  History,
  X,
  Layers,
} from "lucide-react";

export default function Sidebar({ ctx, active, open, onClose }) {
  const badge = { compare: ctx.compare.length, saved: ctx.saved.length };

  const handleNav = (page) => {
    ctx.go(page);
    onClose();
  };

  const navItems = [
    { page: "dashboard", label: "Discover", icon: Search },
    { page: "search", label: "Search Papers", icon: Layers },
    { page: "recommendations", label: "Method", icon: FlaskConical },
    { page: "compare", label: "Compare Papers", icon: GitCompare, badgeKey: "compare" },
    { page: "saved", label: "Project note", icon: Bookmark, badgeKey: "saved" },
    { page: "history", label: "Search History", icon: History },
  ];

  return (
    <>
      {open && <div className="drawer-overlay" onClick={onClose} />}
      <aside className={"drawer" + (open ? " open" : "")} aria-label="Mobile Navigation">
        <div className="drawer-header">
          <button
            className="navbar-brand"
            onClick={() => handleNav("dashboard")}
          >
            <span className="navbar-brand-logo">
              <BookOpen size={16} strokeWidth={1.75} />
            </span>
            <span className="navbar-brand-name">Research Index</span>
          </button>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="drawer-nav">
          {navItems.map(({ page, label, icon: Icon, badgeKey }) => {
            const isActive = active === page;
            const count = badgeKey ? badge[badgeKey] : 0;
            return (
              <button
                key={page}
                className={"drawer-nav-item" + (isActive ? " active" : "")}
                onClick={() => handleNav(page)}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
                {count > 0 && <span className="badge-count">{count}</span>}
              </button>
            );
          })}
        </nav>

      </aside>
    </>
  );
}

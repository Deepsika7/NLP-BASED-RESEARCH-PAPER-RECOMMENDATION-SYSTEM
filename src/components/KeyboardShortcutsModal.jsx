import { X } from "lucide-react";

const shortcuts = [
  { keys: ["Ctrl", "K"], description: "Open quick search" },
  { keys: ["S"], description: "Save / unsave current paper" },
  { keys: ["C"], description: "Add current paper to compare" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Esc"], description: "Close modals / go back" },
];

export default function KeyboardShortcutsModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Keyboard</span>
            <h3 className="modal-title">Shortcuts</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {shortcuts.map(({ keys, description }) => (
            <li key={description} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{description}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {keys.map((k) => <kbd key={k} className="kbd-key">{k}</kbd>)}
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small" style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          Shortcuts work when no input field is focused.
        </p>
      </div>
    </div>
  );
}

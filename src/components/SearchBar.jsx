import { useState, useRef, useEffect } from "react";
import { Search, X, BookOpen, Tag } from "lucide-react";

export default function SearchBar({ value, onChange, onSubmit, onClear, placeholder, buttonLabel, large, suggestions = [] }) {
  const [focused, setFocused] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const showDropdown = focused && value.trim().length >= 1 && suggestions.length > 0;

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === "Enter") onSubmit?.();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIdx >= 0 && suggestions[focusedIdx]) {
        onChange(suggestions[focusedIdx].text);
        onSubmit?.(suggestions[focusedIdx].text);
        setFocusedIdx(-1);
      } else {
        onSubmit?.();
      }
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  const handleSuggestionClick = (s) => {
    onChange(s.text);
    onSubmit?.(s.text);
    setFocused(false);
    setFocusedIdx(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="search-autocomplete-wrap">
      <div className={"search-input-box" + (large ? " large" : "")}>
        <Search size={large ? 18 : 16} strokeWidth={1.8} className="search-input-icon" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setFocusedIdx(-1); }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Search papers..."}
          style={{ fontSize: large ? 16 : 15 }}
          aria-label="Search"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        {value && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => { onClear?.(); setFocused(false); }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          className="btn-rust"
          style={{ padding: large ? "9px 20px" : "7px 16px", fontSize: large ? 14 : 13 }}
          onClick={() => onSubmit?.()}
        >
          {buttonLabel || "Search"}
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="autocomplete-dropdown" ref={dropdownRef}>
          {suggestions.map((s, i) => (
            <button
              key={s.text + i}
              type="button"
              className={"autocomplete-item" + (i === focusedIdx ? " focused" : "")}
              onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
            >
              <span className="autocomplete-item-icon">
                {s.type === "topic" ? <Tag size={13} /> : <BookOpen size={13} />}
              </span>
              <span className="autocomplete-item-text">{s.text}</span>
              <span className="autocomplete-item-type">{s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

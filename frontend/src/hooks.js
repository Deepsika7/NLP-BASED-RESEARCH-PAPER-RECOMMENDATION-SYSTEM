import { useEffect, useState } from "react";
import { api } from "./api.js";

/** Debounced server-side autocomplete for the search bars. */
export function useSuggestions(query, delay = 120) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const q = (query || "").trim();
    if (!q) { setItems([]); return undefined; }
    let live = true;
    const t = setTimeout(() => {
      api.suggest(q).then((r) => live && setItems(r.suggestions)).catch(() => live && setItems([]));
    }, delay);
    return () => { live = false; clearTimeout(t); };
  }, [query, delay]);
  return items;
}

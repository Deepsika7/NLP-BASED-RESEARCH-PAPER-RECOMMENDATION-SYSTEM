// Thin REST client for the ResearchAI backend. A guest account is created automatically
// on first load so the app works with no sign-up; the JWT lives in localStorage.
const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const TOKEN_KEY = "rai_token";

const store = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

let guestPromise = null;
async function ensureSession() {
  if (store.get()) return store.get();
  guestPromise ??= fetch(`${BASE}/auth/guest`, { method: "POST" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new ApiError(r.status, "Could not start session"))))
    .then((d) => { store.set(d.token); return d.token; })
    .finally(() => { guestPromise = null; });
  return guestPromise;
}

async function raw(method, path, body, retry = true) {
  const token = await ensureSession();
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && retry) { store.clear(); return raw(method, path, body, false); }
  return res;
}

async function request(method, path, body) {
  const res = await raw(method, path, body);
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || res.statusText, data);
  return data;
}

const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") s.set(k, v); });
  const out = s.toString();
  return out ? `?${out}` : "";
};

/** Fetch an authenticated file and trigger a browser download. */
async function download(path, filename) {
  const res = await raw("GET", path);
  if (!res.ok) throw new ApiError(res.status, "Download failed");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  bootstrap: () => request("GET", "/bootstrap"),
  state: () => request("GET", "/me/state"),

  searchPapers: ({ query, category, topic, year, sort, topicMatch, limit }) =>
    request("GET", `/papers${qs({ q: query, category, topic, year, sort, topicMatch, limit })}`),
  suggest: (q) => request("GET", `/papers/suggest${qs({ q })}`),
  related: (id, limit = 3) => request("GET", `/papers/${id}/related${qs({ limit })}`),
  cite: (id, format) => request("GET", `/papers/${id}/cite${qs({ format })}`),
  downloadBib: (id, filename) => download(`/papers/${id}/cite?download=true`, filename),
  recordView: (id) => request("POST", `/papers/${id}/view`),

  recommendations: (interests) => request("POST", "/recommendations", { interests }),
  compare: (ids) => request("GET", `/compare${qs({ ids: ids.join(",") })}`),
  downloadComparison: (ids, filename) => download(`/compare/export${qs({ ids: ids.join(",") })}`, filename),

  save: (id) => request("PUT", `/me/saved/${id}`),
  unsave: (id) => request("DELETE", `/me/saved/${id}`),
  setTag: (id, tag) => request("PUT", `/me/saved/${id}/tag`, { tag }),
  downloadSaved: (format, filename) => download(`/me/saved/export?format=${format}`, filename),
  setNote: (id, text) => request("PUT", `/me/notes/${id}`, { text }),
  addHistory: (q) => request("POST", "/me/history", { q }),
  clearHistory: () => request("DELETE", "/me/history"),
  addCompare: (id) => request("PUT", `/me/compare/${id}`),
  removeCompare: (id) => request("DELETE", `/me/compare/${id}`),
  clearCompare: () => request("DELETE", "/me/compare"),

  // Optional account endpoints (no UI yet): upgrade the guest or sign in and merge guest data.
  register: async (email, password, name) => { const d = await request("POST", "/auth/register", { email, password, name }); store.set(d.token); return d; },
  login: async (email, password) => { const d = await request("POST", "/auth/login", { email, password }); store.set(d.token); return d; },
};

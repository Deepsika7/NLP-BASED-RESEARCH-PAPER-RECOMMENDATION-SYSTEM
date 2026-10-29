"use strict";
/** All per-user persistence (saved, tags, notes, history, recents, compare). */
const MAX_HISTORY = 20;
const MAX_RECENT = 6;
const MAX_COMPARE = 4;

function createUserData(db) {
  const q = {
    saved: db.prepare("SELECT paper_id id, tag FROM saved_papers WHERE user_id=? ORDER BY saved_at, paper_id"),
    notes: db.prepare("SELECT paper_id id, text FROM notes WHERE user_id=?"),
    history: db.prepare("SELECT id, q, t FROM search_history WHERE user_id=? ORDER BY t DESC, id DESC LIMIT ?"),
    recent: db.prepare("SELECT paper_id id FROM recent_views WHERE user_id=? ORDER BY viewed_at DESC LIMIT ?"),
    compare: db.prepare("SELECT paper_id id FROM compare_items WHERE user_id=? ORDER BY position"),
    isSaved: db.prepare("SELECT 1 FROM saved_papers WHERE user_id=? AND paper_id=?"),
    save: db.prepare("INSERT OR IGNORE INTO saved_papers (user_id,paper_id,saved_at) VALUES (?,?,?)"),
    unsave: db.prepare("DELETE FROM saved_papers WHERE user_id=? AND paper_id=?"),
    setTag: db.prepare("UPDATE saved_papers SET tag=? WHERE user_id=? AND paper_id=?"),
    firstSave: db.prepare("SELECT first_save_done f FROM users WHERE id=?"),
    markFirst: db.prepare("UPDATE users SET first_save_done=1 WHERE id=?"),
    putNote: db.prepare(`INSERT INTO notes (user_id,paper_id,text,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(user_id,paper_id) DO UPDATE SET text=excluded.text, updated_at=excluded.updated_at`),
    delNote: db.prepare("DELETE FROM notes WHERE user_id=? AND paper_id=?"),
    putHistory: db.prepare(`INSERT INTO search_history (user_id,q,q_lower,t) VALUES (?,?,?,?)
      ON CONFLICT(user_id,q_lower) DO UPDATE SET q=excluded.q, t=excluded.t`),
    trimHistory: db.prepare(`DELETE FROM search_history WHERE user_id=? AND id NOT IN
      (SELECT id FROM search_history WHERE user_id=? ORDER BY t DESC, id DESC LIMIT ?)`),
    clearHistory: db.prepare("DELETE FROM search_history WHERE user_id=?"),
    delHistory: db.prepare("DELETE FROM search_history WHERE user_id=? AND id=?"),
    putRecent: db.prepare(`INSERT INTO recent_views (user_id,paper_id,viewed_at) VALUES (?,?,?)
      ON CONFLICT(user_id,paper_id) DO UPDATE SET viewed_at=excluded.viewed_at`),
    trimRecent: db.prepare(`DELETE FROM recent_views WHERE user_id=? AND paper_id NOT IN
      (SELECT paper_id FROM recent_views WHERE user_id=? ORDER BY viewed_at DESC LIMIT ?)`),
    cmpHas: db.prepare("SELECT 1 FROM compare_items WHERE user_id=? AND paper_id=?"),
    cmpCount: db.prepare("SELECT COUNT(*) n, COALESCE(MAX(position),0) m FROM compare_items WHERE user_id=?"),
    cmpAdd: db.prepare("INSERT INTO compare_items (user_id,paper_id,position) VALUES (?,?,?)"),
    cmpDel: db.prepare("DELETE FROM compare_items WHERE user_id=? AND paper_id=?"),
    cmpClear: db.prepare("DELETE FROM compare_items WHERE user_id=?"),
  };

  // Strictly increasing so ordering is stable even within the same millisecond.
  let last = 0;
  const now = () => (last = Math.max(Date.now(), last + 1));

  const savedIds = (uid) => q.saved.all(uid).map((r) => r.id);
  const compareIds = (uid) => q.compare.all(uid).map((r) => r.id);

  return {
    MAX_COMPARE,
    savedIds, compareIds,
    recentQueries: (uid, n = 5) => q.history.all(uid, n).map((r) => r.q),

    state(uid) {
      const saved = q.saved.all(uid);
      return {
        saved: saved.map((r) => r.id),
        tags: Object.fromEntries(saved.filter((r) => r.tag).map((r) => [r.id, r.tag])),
        notes: Object.fromEntries(q.notes.all(uid).map((r) => [r.id, r.text])),
        history: q.history.all(uid, MAX_HISTORY).map((r) => ({ id: r.id, q: r.q, t: r.t })),
        recent: q.recent.all(uid, MAX_RECENT).map((r) => r.id),
        compare: compareIds(uid),
        firstSaveDone: !!q.firstSave.get(uid)?.f,
      };
    },

    save(uid, pid) {
      let firstSave = false;
      db.transaction(() => {
        q.save.run(uid, pid, now());
        if (!q.firstSave.get(uid).f) { q.markFirst.run(uid); firstSave = true; }
      })();
      return { saved: savedIds(uid), firstSave };
    },
    unsave(uid, pid) { q.unsave.run(uid, pid); return { saved: savedIds(uid) }; },
    isSaved: (uid, pid) => !!q.isSaved.get(uid, pid),
    setTag(uid, pid, tag) {
      const r = q.setTag.run(tag, uid, pid);
      return r.changes > 0;
    },

    setNote(uid, pid, text) {
      const t = (text || "").trim();
      if (!t) q.delNote.run(uid, pid); else q.putNote.run(uid, pid, t, now());
      return Object.fromEntries(q.notes.all(uid).map((r) => [r.id, r.text]));
    },

    addHistory(uid, text) {
      const s = (text || "").trim();
      if (s) db.transaction(() => {
        q.putHistory.run(uid, s, s.toLowerCase(), now());
        q.trimHistory.run(uid, uid, MAX_HISTORY);
      })();
      return q.history.all(uid, MAX_HISTORY).map((r) => ({ id: r.id, q: r.q, t: r.t }));
    },
    clearHistory(uid) { q.clearHistory.run(uid); },
    deleteHistoryItem(uid, id) { return q.delHistory.run(uid, id).changes > 0; },

    addRecent(uid, pid) {
      db.transaction(() => { q.putRecent.run(uid, pid, now()); q.trimRecent.run(uid, uid, MAX_RECENT); })();
      return q.recent.all(uid, MAX_RECENT).map((r) => r.id);
    },

    /** returns { ok, compare, reason } */
    addCompare(uid, pid) {
      if (q.cmpHas.get(uid, pid)) return { ok: true, compare: compareIds(uid) };
      const { n, m } = q.cmpCount.get(uid);
      if (n >= MAX_COMPARE) return { ok: false, reason: "limit", compare: compareIds(uid) };
      q.cmpAdd.run(uid, pid, m + 1);
      return { ok: true, compare: compareIds(uid) };
    },
    removeCompare(uid, pid) { q.cmpDel.run(uid, pid); return compareIds(uid); },
    clearCompare(uid) { q.cmpClear.run(uid); return []; },

    /** Move everything from a guest account into a real one (used on login). */
    merge(fromId, toId) {
      db.transaction(() => {
        db.prepare("INSERT OR IGNORE INTO saved_papers (user_id,paper_id,tag,saved_at) SELECT ?,paper_id,tag,saved_at FROM saved_papers WHERE user_id=?").run(toId, fromId);
        db.prepare("INSERT OR IGNORE INTO notes (user_id,paper_id,text,updated_at) SELECT ?,paper_id,text,updated_at FROM notes WHERE user_id=?").run(toId, fromId);
        db.prepare("INSERT OR IGNORE INTO search_history (user_id,q,q_lower,t) SELECT ?,q,q_lower,t FROM search_history WHERE user_id=?").run(toId, fromId);
        db.prepare("INSERT OR IGNORE INTO recent_views (user_id,paper_id,viewed_at) SELECT ?,paper_id,viewed_at FROM recent_views WHERE user_id=?").run(toId, fromId);
        q.trimHistory.run(toId, toId, MAX_HISTORY);
        q.trimRecent.run(toId, toId, MAX_RECENT);
        db.prepare("DELETE FROM users WHERE id=? AND is_guest=1").run(fromId);
      })();
    },
  };
}
module.exports = { createUserData };

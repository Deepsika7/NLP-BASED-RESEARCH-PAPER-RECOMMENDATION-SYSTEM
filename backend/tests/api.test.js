"use strict";
const test = require("node:test");
const assert = require("node:assert");
process.env.ADMIN_API_KEY = "test-admin";
process.env.DB_FILE = ":memory:";
const { createApp } = require("../src/app");
const { openDb } = require("../src/db");

let server, base;
test.before(() => new Promise((r) => {
  server = createApp({ db: openDb(":memory:") }).listen(0, () => { base = `http://127.0.0.1:${server.address().port}/api`; r(); });
}));
test.after(() => server.close());

const call = async (method, url, { token, body, headers } = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  return { status: res.status, headers: res.headers, data: ct.includes("json") ? await res.json() : await res.text() };
};
const guest = async () => (await call("POST", "/auth/guest")).data.token;

test("health + bootstrap + facets", async () => {
  assert.equal((await call("GET", "/health")).data.totalPapers, 30);
  const b = (await call("GET", "/bootstrap")).data;
  assert.equal(b.papers.length, 30); assert.equal(b.state, null); assert.ok(b.exampleQueries.length);
  assert.ok((await call("GET", "/topics")).data.length > 10);
  assert.equal((await call("GET", "/stats")).data.papers, 30);
});

test("root and health endpoints respond instead of default 404", async () => {
  const root = await fetch(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(root.status, 200);
  const rootData = await root.json();
  assert.equal(rootData.service, "ResearchAI API");
  assert.equal(rootData.health, "/api/health");

  const health = await fetch(`http://127.0.0.1:${server.address().port}/health`);
  assert.equal(health.status, 200);
  const healthData = await health.json();
  assert.equal(healthData.status, "ok");
  assert.equal(healthData.totalPapers, 30);
});

test("paper search, validation, 404", async () => {
  const r = (await call("GET", "/papers?q=carcinogens")).data;
  assert.ok(r.total > 0);
  assert.equal((await call("GET", "/papers?year=2024&sort=title")).data.papers.every((p) => p.year === 2024), true);
  assert.equal((await call("GET", "/papers?sort=bogus")).status, 400);
  assert.equal((await call("GET", "/papers?limit=2&offset=1")).data.count, 2);
  assert.equal((await call("GET", "/papers/9999")).status, 404);
  assert.equal((await call("GET", "/papers/abc")).status, 400);
  assert.ok((await call("GET", "/papers/1/related")).data.papers.length > 0);
  assert.ok((await call("GET", "/papers/suggest?q=deep")).data.suggestions.length > 0);
  assert.match((await call("GET", "/papers/1/cite?format=apa")).data.citation, /\(2021\)/);
  const dl = await call("GET", "/papers/1/cite?download=true");
  assert.match(dl.headers.get("content-disposition"), /Sharma_2021\.bib/);
});

test("auth required for user data", async () => {
  assert.equal((await call("GET", "/me/state")).status, 401);
  assert.equal((await call("GET", "/me/state", { token: "garbage" })).status, 401);
});

test("saved / tags / notes / history / recent / first-save flag", async () => {
  const t = await guest();
  let s = (await call("GET", "/me/state", { token: t })).data;
  assert.deepEqual(s.saved, []); assert.equal(s.firstSaveDone, false);

  let r = (await call("PUT", "/me/saved/3", { token: t })).data;
  assert.deepEqual(r.saved, [3]); assert.equal(r.firstSave, true);
  r = (await call("PUT", "/me/saved/1", { token: t })).data;
  assert.deepEqual(r.saved, [3, 1]); assert.equal(r.firstSave, false);
  assert.equal((await call("PUT", "/me/saved/999", { token: t })).status, 404);

  assert.equal((await call("PUT", "/me/saved/3/tag", { token: t, body: { tag: "done" } })).data.tags[3], "done");
  assert.equal((await call("PUT", "/me/saved/3/tag", { token: t, body: { tag: "nope" } })).status, 400);
  assert.equal((await call("PUT", "/me/saved/2/tag", { token: t, body: { tag: "done" } })).status, 404);

  assert.equal((await call("PUT", "/me/notes/3", { token: t, body: { text: "  hi  " } })).data.notes[3], "hi");
  assert.deepEqual((await call("PUT", "/me/notes/3", { token: t, body: { text: "  " } })).data.notes, {});

  await call("POST", "/me/history", { token: t, body: { q: "RAG" } });
  await call("POST", "/me/history", { token: t, body: { q: "cancer" } });
  const h = (await call("POST", "/me/history", { token: t, body: { q: "rag" } })).data.history;
  assert.deepEqual(h.map((x) => x.q), ["rag", "cancer"]);
  for (let i = 0; i < 25; i++) await call("POST", "/me/history", { token: t, body: { q: "q" + i } });
  assert.equal((await call("GET", "/me/history", { token: t })).data.history.length, 20);

  for (const id of [1, 2, 3, 4, 5, 6, 7]) await call("POST", `/papers/${id}/view`, { token: t });
  const rec = (await call("POST", "/papers/3/view", { token: t })).data.recent;
  assert.equal(rec.length, 6); assert.equal(rec[0], 3);

  assert.deepEqual((await call("DELETE", "/me/saved/3", { token: t })).data.saved, [1]);
  assert.deepEqual((await call("DELETE", "/me/history", { token: t })).data.history, []);

  // isolation between users
  const t2 = await guest();
  assert.deepEqual((await call("GET", "/me/state", { token: t2 })).data.saved, []);
});

test("compare list limit + analysis + csv", async () => {
  const t = await guest();
  for (const id of [3, 20, 6, 14]) assert.equal((await call("PUT", `/me/compare/${id}`, { token: t })).status, 200);
  const over = await call("PUT", "/me/compare/1", { token: t });
  assert.equal(over.status, 409); assert.deepEqual(over.data.compare, [3, 20, 6, 14]);
  assert.deepEqual((await call("DELETE", "/me/compare/6", { token: t })).data.compare, [3, 20, 14]);
  const c = (await call("GET", "/compare?ids=3,20,14")).data;
  assert.equal(c.papers.length, 3); assert.ok(Array.isArray(c.common)); assert.equal(Object.keys(c.unique).length, 3);
  assert.equal((await call("GET", "/compare?ids=1,2,3,4,5")).status, 400);
  assert.equal((await call("GET", "/compare?ids=1,999")).status, 404);
  assert.match((await call("GET", "/compare/export?ids=1,2")).data, /^"Feature"/);
  assert.deepEqual((await call("DELETE", "/me/compare", { token: t })).data.compare, []);
});

test("recommendations cold + personalised", async () => {
  const t = await guest();
  const cold = (await call("POST", "/recommendations", { token: t, body: {} })).data;
  assert.equal(cold.personalised, false); assert.equal(cold.list.length, 8);
  const hot = (await call("POST", "/recommendations", { token: t, body: { interests: ["Healthcare AI"] } })).data;
  assert.equal(hot.personalised, true); assert.ok(hot.list[0].why.includes("interests"));
  await call("PUT", "/me/saved/1", { token: t });
  const after = (await call("POST", "/recommendations", { token: t, body: {} })).data;
  assert.ok(after.personalised && !after.list.some((x) => x.paper.id === 1));
});

test("exports", async () => {
  const t = await guest();
  await call("PUT", "/me/saved/1", { token: t });
  await call("PUT", "/me/notes/1", { token: t, body: { text: "=cmd()" } });
  const csv = await call("GET", "/me/saved/export?format=csv", { token: t });
  assert.match(csv.headers.get("content-disposition"), /reading_list_.*\.csv/); assert.match(csv.data, /'=cmd\(\)/);
  assert.match((await call("GET", "/me/saved/export?format=md", { token: t })).data, /Curated Reading List/);
  assert.match((await call("GET", "/me/saved/export?format=bib", { token: t })).data, /@article/);
});

test("register upgrades guest; login merges guest data; errors", async () => {
  const g = await guest();
  await call("PUT", "/me/saved/5", { token: g });
  const reg = await call("POST", "/auth/register", { token: g, body: { email: "A@x.com", password: "password1", name: "Ann" } });
  assert.equal(reg.status, 201); assert.equal(reg.data.user.isGuest, false); assert.equal(reg.data.user.email, "a@x.com");
  assert.deepEqual((await call("GET", "/me/state", { token: reg.data.token })).data.saved, [5]);
  assert.equal((await call("POST", "/auth/register", { body: { email: "a@x.com", password: "password1" } })).status, 409);
  assert.equal((await call("POST", "/auth/register", { body: { email: "bad", password: "short" } })).status, 400);

  const g2 = await guest();
  await call("PUT", "/me/saved/7", { token: g2 });
  const login = await call("POST", "/auth/login", { token: g2, body: { email: "a@x.com", password: "password1" } });
  assert.equal(login.status, 200);
  assert.deepEqual((await call("GET", "/me/state", { token: login.data.token })).data.saved.sort(), [5, 7]);
  assert.equal((await call("GET", "/me/state", { token: g2 })).status, 401); // merged guest removed
  assert.equal((await call("POST", "/auth/login", { body: { email: "a@x.com", password: "wrongpass1" } })).status, 401);

  const tok = login.data.token;
  assert.equal((await call("POST", "/auth/change-password", { token: tok, body: { currentPassword: "password1", newPassword: "newpassword1" } })).status, 200);
  assert.equal((await call("POST", "/auth/login", { body: { email: "a@x.com", password: "newpassword1" } })).status, 200);
  assert.equal((await call("DELETE", "/auth/me", { token: tok })).status, 204);
  assert.equal((await call("GET", "/auth/me", { token: tok })).status, 401);
});

test("admin CRUD", async () => {
  const body = { title: "New Paper", abstract: "About zyzzyva and graphs.", authors: ["Z. Zed"], year: 2025, topics: ["Graph Analysis"], keywords: ["zyzzyva"], category: "Data Science" };
  assert.equal((await call("POST", "/papers", { body })).status, 403);
  assert.equal((await call("POST", "/papers", { body, headers: { "x-admin-key": "wrong" } })).status, 403);
  const h = { "x-admin-key": "test-admin" };
  const created = await call("POST", "/papers", { body, headers: h });
  assert.equal(created.status, 201); const id = created.data.id; assert.match(created.data.scholarUrl, /scholar\.google/);
  assert.equal((await call("GET", "/papers?q=zyzzyva")).data.total, 1);
  assert.equal((await call("PUT", `/papers/${id}`, { body: { ...body, title: "Renamed" }, headers: h })).data.title, "Renamed");
  assert.equal((await call("POST", "/papers", { body: { ...body, year: "x" }, headers: h })).status, 400);
  assert.equal((await call("DELETE", `/papers/${id}`, { headers: h })).status, 204);
  assert.equal((await call("GET", `/papers/${id}`)).status, 404);
});

test("bad JSON and unknown route", async () => {
  const res = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{nope" });
  assert.equal(res.status, 400);
  assert.equal((await call("GET", "/nothing")).status, 404);
});

# ResearchAI – Research Paper Recommendation System

React + Vite frontend (unchanged UI) with a full Express + SQLite backend.

```
frontend/   React app (talks to the API through src/api.js)
backend/    Express REST API, SQLite database, NLP search / recommendation engine
```

## Run (development)

Requires Node.js 18+.

```bash
npm install            # root: installs `concurrently`
npm run install:all    # installs frontend + backend dependencies
npm run dev            # frontend http://localhost:5173  +  API http://localhost:3001
```

## Run (production, single server)

```bash
npm run install:all
npm run build          # builds frontend/dist
npm start              # API + built UI on http://localhost:3001
```

## What the backend does

- **Persistence (SQLite, `backend/storage/app.db`)** – saved papers, reading tags, notes, search history,
  recently viewed and the compare list are stored per user. Papers are seeded from `backend/src/seed/papers.json`.
- **Accounts** – the app creates an anonymous guest account automatically (JWT kept in the browser), so no sign-up
  screen is needed. `POST /api/auth/register` upgrades that guest in place; `POST /api/auth/login` signs in
  and merges the guest's data. Passwords are bcrypt-hashed.
- **NLP engine (server-side)** – query expansion with domain aliases (e.g. *carcinogens → cancer, oncology…*),
  stemming, multi-field weighted scoring, related papers, personalised recommendations, common/unique topics.
- **Exports & citations** – BibTeX / APA / Chicago, reading list as CSV / Markdown / BibTeX, comparison CSV.
- **Hardening** – helmet, CORS allow-list, rate limiting, zod validation, CSV formula-injection guard.
- Data from the earlier localStorage version is imported to the server automatically on first load.

## API reference (`/api`)

| Method & path | Purpose |
|---|---|
| `GET /health` | Health check |
| `GET /bootstrap` | Catalog + facets + the user's state (first paint) |
| `GET /papers?q&category&topic&topicMatch&year&sort&limit&offset` | Search / filter / sort |
| `GET /papers/suggest?q` | Autocomplete |
| `GET /papers/:id`, `/papers/:id/related`, `/papers/:id/cite?format=bibtex\|apa\|chicago[&download=true]` | Paper, related, citation |
| `POST /papers/:id/view` | Record "recently viewed" |
| `POST /recommendations` `{interests[]}` | Personalised picks (interests + saved + history) |
| `GET /compare?ids=1,2,3` · `GET /compare/export?ids=` | Common/unique topics · CSV |
| `GET /categories` `/topics` `/years` `/stats` | Facets |
| `GET /me/state` | All of the user's data |
| `PUT/DELETE /me/saved/:id` · `PUT /me/saved/:id/tag` · `GET /me/saved/export?format=csv\|md\|bib` | Reading list |
| `PUT/DELETE /me/notes/:id` | Notes |
| `GET/POST/DELETE /me/history` · `DELETE /me/history/:id` | Search history |
| `PUT/DELETE /me/compare/:id` · `DELETE /me/compare` | Compare list (max 4, else 409) |
| `POST /auth/guest` `/auth/register` `/auth/login` `/auth/change-password` · `GET/PATCH/DELETE /auth/me` | Accounts |
| `POST/PUT/DELETE /papers[/:id]` | Admin CRUD – send `x-admin-key` (set `ADMIN_API_KEY`) |

All `/me/*`, `/recommendations` and `/papers/:id/view` calls need `Authorization: Bearer <token>`.

## Configuration

Copy `backend/.env.example` to `backend/.env`. Useful keys: `PORT`, `JWT_SECRET`, `ADMIN_API_KEY`, `CORS_ORIGINS`, `DB_FILE`.

## Tests

```bash
cd backend && npm test      # 16 API + engine tests
```

Papers are illustrative demo records (see `backend/src/seed/papers.json`).

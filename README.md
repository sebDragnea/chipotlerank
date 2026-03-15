# ChipotleRank

Reddit-style voting app for Chipotle orders. Users submit photos of their orders, and the community upvotes or downvotes them.

## Tech Stack

- **Backend**: Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend**: React + TypeScript + Vite

## Project Structure

```
chipotlerank/
├── backend/
│   ├── src/
│   │   └── index.js        # Express server
│   ├── uploads/            # Uploaded images (auto-created)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── PostCard.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── SubmitPage.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── types.ts
│   │   └── voterId.ts
│   ├── index.html
│   └── package.json
├── package.json            # Root (concurrently runner)
└── README.md
```

## Setup

### 1. Install dependencies

From the project root:

```bash
npm install          # installs concurrently at root
npm run install:all  # installs backend + frontend deps
```

Or manually:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Run in development

From the project root:

```bash
npm run dev
```

This starts:
- Backend at `http://localhost:3001`
- Frontend at `http://localhost:5173`

Open your browser to `http://localhost:5173`.

## Features

- **Submit orders**: Upload a photo of your Chipotle order with a title and description.
- **Vote**: Upvote or downvote any submission. Toggle your vote by clicking the same button again.
- **Sort**: Switch between **Top** (net score), **Best** (% positive), and **New** (most recent).
- **Score display**: Net score and % liked shown on each card.
- **Lightbox**: Click any image to view it full size.
- **Persistent voter ID**: Your vote identity is stored in `localStorage` so your votes persist across page loads.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts?sort=top\|best\|new` | List all posts |
| POST | `/api/posts` | Create a post (multipart/form-data) |
| POST | `/api/posts/:id/vote` | Vote on a post |
| GET | `/uploads/:filename` | Serve uploaded images |

## Notes

- The SQLite database (`chipotlerank.db`) is created automatically in the `backend/` directory on first run.
- Uploaded images are stored in `backend/uploads/`.
- The frontend proxies `/api` and `/uploads` requests to the backend via Vite's dev server proxy.

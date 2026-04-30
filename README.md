## History Timeline

**History Timeline** is a Next.js (App Router) web app for browsing historical events in a clean timeline UI with search and category filters. It includes an admin dashboard for creating, editing, and deleting events (single dates or date ranges), with optional image uploads. For simplicity, events are stored in a local JSON file (`data/events.json`) and images are saved to `public/uploads/`, making it easy to run locally and later migrate to a database while keeping the same API shape.

- **Public timeline**: `/`
- **Admin dashboard**: `/admin`
- **Data storage**: `data/events.json` (JSON file)
- **Uploaded images**: saved to `public/uploads/` and referenced by path like `/uploads/<file>`

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` with your browser to see the result.

## Managing events

- Go to `/admin` to create/edit/delete events.
- Events support:
  - **Exact** date (year required; month/day optional)
  - **Range** date (start + end; end must be >= start)
  - **Categories** (free-form slugs like `war`, `public-figure`)
  - Optional **image** upload (stored locally)

## API endpoints (for reference)

- `GET /api/events` → `{ events }` (supports optional `?q=` and `?categories=a,b,c`)
- `POST /api/events` → create
- `PATCH /api/events/:id` → update
- `DELETE /api/events/:id` → delete
- `POST /api/uploads` (multipart form field: `file`) → `{ imagePath }`

## Notes

- JSON storage is best for **single-admin / low-concurrency** usage. It’s intentionally simple and easy to upgrade later to SQLite/Postgres while keeping the same API shape.

## Learn more (Next.js)

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

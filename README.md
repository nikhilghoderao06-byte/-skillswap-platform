# SkillSwap — Student Skill Exchange

A peer-to-peer platform where students teach the skills they have and learn the skills they want.
Students list skills, find peers, send swap requests, schedule sessions and review each other.

## Features

- Register and log in (JWT, bcrypt-hashed passwords)
- Profile with college, year of study and bio
- Skills: mark what you can teach and what you want to learn
- Browse students and send swap requests (Online, Offline or Hybrid)
- Accept or reject requests, then schedule, complete or cancel sessions
- Reviews and ratings, only after a completed session (one review per session)
- Installable on phones (PWA) with an offline page

## Tech stack

| Part | Technology | Hosting |
|---|---|---|
| Frontend | Next.js, React, Tailwind CSS | Vercel (root directory `frontend`) |
| Backend | Node.js, Express REST API | Render (root directory `backend`, start command `npm start`) |
| Database | PostgreSQL | Neon |

## Project structure

```
backend/    Express API (routes/, middleware/, config/)
frontend/   Next.js app (app/, context/, utils/, public/)
```

## Environment variables

Backend (`backend/.env` locally, Environment tab on Render). Never commit this file.

| Name | Purpose |
|---|---|
| `PORT` | Port the API listens on (Render sets it) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | Long random secret used to sign login tokens |
| `JWT_EXPIRE` | Token lifetime, for example `7d` |
| `FRONTEND_URL` | Allowed website address(es) for CORS, comma-separated |

Frontend (`frontend/.env.local` locally, Environment Variables on Vercel):

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Address of the backend, no trailing slash |

## Run locally

```
cd backend
npm install
npm run dev        # http://localhost:5000, check /api/health

cd frontend
npm install
npm run dev        # http://localhost:3000
```

## Security in the API

- Passwords hashed with bcrypt; sign-up needs 8+ characters with a letter and a number
- Failed logins are rate-limited per IP; sign-ups are rate-limited per hour
- CORS restricted to `FRONTEND_URL`; secure HTTP headers via helmet
- Every write checks ownership (own profile, own requests, session participants only)
- Requests, sessions and private messages can only be read by the people involved
- Input is validated on the server (emails, names, years, dates, modes, message length)

## Database backup and restore

```
# Back up everything (data and structure)
pg_dump "CONNECTION_STRING" --no-owner --no-acl -f skillswap_backup.sql

# Structure only, to keep in the repository as database/schema.sql
pg_dump "CONNECTION_STRING" --schema-only --no-owner --no-acl -f database/schema.sql

# Restore into an empty database
psql "CONNECTION_STRING" -f skillswap_backup.sql
```

## Notes for free hosting

The free Render backend sleeps when idle and the free Neon database pauses after about 5 minutes
without use. The first request after a quiet period can take up to a minute.

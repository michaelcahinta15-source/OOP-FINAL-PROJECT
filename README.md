# Courtside Tournament Manager

A basketball tournament manager with a browser-native ES2022 frontend and a small Node.js backend. It has no framework, third-party packages, or build step. Local demos use JSON-file storage; Vercel account persistence uses Supabase Postgres.

## Run locally

Requires Node.js 20 or newer. Do not open `index.html` directly or use a separate static server; the app's pages and API must use the same origin.

The project includes an ignored `.env` starter with `admin@gmail.com` as the initial admin email. Set a private password with at least 12 characters before starting the server; the server will refuse to create an administrator until one is set. You can edit `.env` directly or copy `.env.example` and customize it. Never use an example or shared password as your admin password.

The server reads `.env` without third-party packages. Actual environment variables override values in the file. For local demos, the server writes accounts and tournament data to `server/data/courtside.json`. Alternatively, in PowerShell:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "choose-a-private-password-of-12-chars-or-more"
$env:ADMIN_NAME = "Tournament Admin"
npm start
```

Or, without npm:

```powershell
node server/server.mjs
```

Open the address configured by `PORT` (default <http://localhost:3000>). Choose **Settings → Load sample tournament** to populate demo data. The initial admin is created only when the server has no administrator; subsequent accounts and password hashes are stored under the ignored `server/data/` directory. Back up or delete that directory to preserve or reset server accounts and tournament data.

If the sign-in page says the server returned a web page instead of API data, make sure the Node backend is running with `npm start`, open the same host and port it prints (normally <http://localhost:3000>), and don't use VS Code Live Server on port 5500/8765. Live Server only serves files and does not provide the `/api/*` backend.

## Deploy to Vercel with persistent accounts

Vercel's function filesystem is temporary, so the local JSON account file is not persistent there. This project uses Supabase Postgres for account and login-session persistence on Vercel; no npm database package is required.

1. Create a Supabase project and run [`database/schema.sql`](./database/schema.sql) in its SQL Editor.
2. In Vercel Project Settings → Environment Variables, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from the Supabase project. Use the `sb_secret_...` key (not the Publishable key). `SUPABASE_SERVICE_ROLE_KEY` is also accepted as a legacy variable name. Keep the key secret; it is only read by the server function and must never be added to frontend code.
3. Also set `ADMIN_EMAIL` and a private `ADMIN_PASSWORD` of at least 12 characters. The first function startup creates the administrator in Supabase if no admin exists.
4. Deploy the project. Vercel serves the static frontend and uses explicit Node.js function routes under [`api/`](./api), including a dedicated `/api/auth/me` route. The route files delegate to the shared handler in [`server/server.mjs`](./server/server.mjs). Registration stores each viewer's account and password hash in `courtside_accounts`; sessions are stored in `courtside_sessions` and survive function restarts.

The Supabase account and session tables use row-level security without public policies; the backend accesses them with the server-only secret key. Local accounts in `server/data/courtside.json` are not automatically copied to Supabase. Tournament state still uses the local JSON store (under `/tmp` on Vercel), so tournament edits are **not durable on Vercel** yet; use a hosted database-backed tournament store before relying on deployed tournament data.

To check the deployment, open `https://<your-project>.vercel.app/api/auth/me`. A working API returns JSON like `{"user":null}` when signed out. A JSON `503` means to check the Vercel function logs, environment variables, and Supabase schema; a Vercel HTML/text `404` usually means the new API route files have not been deployed or the Vercel project root directory is wrong.

The server binds to `127.0.0.1` by default. This setup is intended for local demos. Do not expose it to the public internet as-is; a shared deployment needs HTTPS, secure cookie configuration, and an appropriately hardened host.

## Security notes

- User-controlled team and tournament names are HTML-escaped before rendering. The dashboard follows this rule for both the current leader and leaderboard.
- The Vercel deployment applies a restrictive Content Security Policy and standard browser security headers to static pages as well as API responses. Keep escaping in place; CSP is defense in depth, not a replacement.
- The application has no LLM integration or prompt-processing endpoint. Its Supabase access uses the PostgREST API with encoded filter values; it does not build SQL from user input.
- Do not commit `.env` or expose `SUPABASE_SERVICE_ROLE_KEY` in browser code. Use Vercel's encrypted environment variables for deployment secrets.
- No web application can guarantee that it is impossible to exploit. Keep dependencies/platforms updated and review security again before using real accounts or sensitive data.

## Accounts and access

- The environment-configured initial account is an **Administrator**. It can manage teams, schedules, games, tournament settings, demo data, and account roles.
- Anyone can create an account from the sign-in page using a Gmail address (or another valid email address). New accounts are **Viewers** and can view the dashboard, teams/rosters, schedule, standings, and bracket; they cannot change tournament data. Registration does not verify control of the email address.
- Administrators can promote trusted accounts to Administrator from the **Admin** page. At least one administrator must remain.
- Sign-in uses salted scrypt password hashes and an HTTP-only, same-site session cookie. Sessions expire after 12 hours; on Vercel, account and session records persist in Supabase across function restarts.

## Features

- Create, edit, and delete teams; assign a division and coach; manage rosters with unique jersey numbers and a 15-player limit.
- Generate round-robin or single-elimination schedules; adjust a game's time and court; detect team time-slot conflicts.
- Record scoring and non-scoring events, undo the last event, finalize or explicitly reopen a game.
- Recompute scores from game events and update division standings, point differential, win percentage, and recent streak.
- Apply an ordered tiebreaker chain; automatically advance winners in a single-elimination bracket, including byes.
- Locally persist tournament state and accounts in `server/data/courtside.json`; optimistic revisions prevent stale pages from silently overwriting newer changes.

## OOP in this project

| Pillar | Where it is demonstrated |
| --- | --- |
| Encapsulation | Domain state uses `#private` fields and intention-revealing methods in [`Team`](./js/domain/Team.js), [`Game`](./js/domain/Game.js), [`Person`](./js/domain/Person.js), and the other entity classes. Roster number uniqueness and game-state rules are validated by the domain. |
| Inheritance | [`Player`](./js/domain/Player.js), [`Coach`](./js/domain/Coach.js), and [`Referee`](./js/domain/Referee.js) extend [`Person`](./js/domain/Person.js). Concrete game formats extend [`GameFormat`](./js/domain/GameFormat.js); tiebreakers extend [`Tiebreaker`](./js/domain/Tiebreaker.js). |
| Abstraction | `Person`, `GameFormat`, and `Tiebreaker` define abstract-like methods that throw until implemented. The app works against these contracts rather than format-specific logic. |
| Polymorphism | [`SchedulingService`](./js/services/SchedulingService.js) calls `generateSchedule()` on the selected format. [`StandingsCalculator`](./js/services/StandingsCalculator.js) orders teams by calling each configured tiebreaker's `compare()` method. `getRole()` is overridden in the person subclasses. |

### Backend and patterns

- [`server/server.mjs`](./server/server.mjs) provides static files, viewer registration, sign-in/sign-out, authenticated tournament reads, administrator-only writes, and administrator account management.
- [`server/AccountRepository.mjs`](./server/AccountRepository.mjs) persists accounts and sessions in Supabase when configured, while retaining the local JSON-file fallback for demos.
- [`StorageService`](./js/services/StorageService.js) is the frontend API client. The local backend JSON file store is written atomically and is not served as a static asset.
- **Strategy:** `RoundRobinFormat` and `SingleEliminationFormat`; the ordered tiebreaker implementations.
- **Factory:** `GameFormatFactory.create()` selects a format strategy.
- **Repository:** [`AccountRepository`](./server/AccountRepository.mjs) stores accounts and sessions in Supabase for Vercel (or the JSON-file store locally); frontend [`StorageService`](./js/services/StorageService.js) calls the authenticated API.
- **Callback:** `ScoringService` notifies the app when a game is finalized; standings are recalculated from saved games when the view renders.

## Manual test checklist

1. Start the server with a private admin email and password; sign in as the initial administrator.
2. Load sample data, add a team/player, generate a schedule, and finalize a game. Confirm standings update.
3. Sign out and register a viewer account. Confirm the tournament is visible and editing actions are absent.
4. As admin, promote the viewer from **Admin**. Sign in as that account and confirm administrator controls appear.
5. Open two browser sessions, save a change in one, then attempt a stale save in the other. Confirm it receives a refresh/reload warning rather than overwriting the newer data.
6. Restart the server and confirm accounts, roles, and tournament data persist.

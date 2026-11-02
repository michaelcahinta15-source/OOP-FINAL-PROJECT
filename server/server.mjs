import { createServer } from "node:http";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AccountRepository, AccountRepositoryError } from "./AccountRepository.mjs";
import { Team } from "../js/domain/Team.js";
import { Game } from "../js/domain/Game.js";

const scrypt = promisify(scryptCallback);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv();
const dataFile = path.resolve(process.env.COURTSIDE_DATA_FILE
  ?? (process.env.VERCEL ? path.join(path.sep, "tmp", "courtside.json") : path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "courtside.json")));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const sessionLifetime = 12 * 60 * 60 * 1000;
const sessions = new Map();
const loginFailures = new Map();
const supabaseServerKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedTiebreakers = new Set(["HEAD_TO_HEAD", "POINT_DIFFERENTIAL", "POINTS_FOR", "WIN_PERCENTAGE"]);
const initialState = () => ({
  tournament: {
    name: "Courtside Invitational",
    format: "ROUND_ROBIN",
    tiebreakerOrder: ["HEAD_TO_HEAD", "POINT_DIFFERENTIAL", "POINTS_FOR", "WIN_PERCENTAGE"],
    status: "SETUP",
  },
  teams: [],
  games: [],
  settings: { bracketByes: [] },
});

function loadDotEnv() {
  let contents;
  try {
    contents = readFileSync(path.join(root, ".env"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const line of contents.split(/\r?\n/)) {
    const entry = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!entry || Object.hasOwn(process.env, entry[1])) continue;
    let value = entry[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    process.env[entry[1]] = value;
  }
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class JsonFileStore {
  #data;
  #writeQueue = Promise.resolve();

  async load() {
    await mkdir(path.dirname(dataFile), { recursive: true });
    try {
      this.#data = JSON.parse(await readFile(dataFile, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      this.#data = { state: initialState(), revision: 0, users: [] };
      await this.save();
    }
    this.#data.state ??= initialState();
    this.#data.revision ??= 0;
    this.#data.users ??= [];
    return this.#data;
  }

  get data() {
    return this.#data;
  }

  save() {
    const snapshot = JSON.stringify(this.#data, null, 2);
    this.#writeQueue = this.#writeQueue.then(async () => {
      const temporaryFile = `${dataFile}.${randomBytes(8).toString("hex")}.tmp`;
      await writeFile(temporaryFile, snapshot, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryFile, dataFile);
    });
    return this.#writeQueue;
  }
}

const store = new JsonFileStore();
let accounts;
let initialization;
let initialized = false;

function cleanUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function validateCredentials({ name, email, password }, registering = false) {
  const cleanEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  if (typeof password !== "string" || password.length < 12 || password.length > 256) {
    throw new HttpError(400, "Password must be between 12 and 256 characters.");
  }
  if (registering && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 70)) {
    throw new HttpError(400, "Name must be between 2 and 70 characters.");
  }
  return { name: name?.trim(), email: cleanEmail, password };
}

async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: derived.toString("hex") };
}

async function bootstrapAdmin() {
  if ((await accounts.list()).some((user) => user.role === "ADMIN")) return;
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Tournament Admin" } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("No administrator exists. Set ADMIN_EMAIL and a private ADMIN_PASSWORD in .env or the environment, then start the server again.");
  }
  const credentials = validateCredentials({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const user = {
    id: randomBytes(16).toString("hex"),
    name: ADMIN_NAME.trim().slice(0, 70) || "Tournament Admin",
    email: credentials.email,
    role: "ADMIN",
    ...await hashPassword(credentials.password),
    createdAt: new Date().toISOString(),
  };
  try {
    await accounts.create(user);
  } catch (error) {
    if (!(error instanceof AccountRepositoryError) || error.status !== 409
      || !(await accounts.list()).some((item) => item.role === "ADMIN")) throw error;
    return;
  }
  console.log(`Created the initial administrator account for ${credentials.email}.`);
}

function initialize() {
  initialization ??= (async () => {
    if (process.env.VERCEL && (!process.env.SUPABASE_URL || !supabaseServerKey)) {
      const missing = [
        !process.env.SUPABASE_URL && "SUPABASE_URL",
        !supabaseServerKey && "SUPABASE_SECRET_KEY",
      ].filter(Boolean);
      const error = new Error(`Add these Vercel Environment Variables: ${missing.join(" and ")}.`);
      error.code = "MISSING_SUPABASE_CONFIG";
      throw error;
    }
    accounts = new AccountRepository(store, {
      url: process.env.SUPABASE_URL,
      key: supabaseServerKey,
    });
    await store.load();
    await bootstrapAdmin();
    initialized = true;
  })();
  return initialization;
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie ?? "").split(";").map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? ["", ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(([key]) => key));
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function createSession(user) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionLifetime).toISOString();
  if (accounts.usesHostedStorage) await accounts.createSession(hashSessionToken(token), user.id, expiresAt);
  else sessions.set(token, { userId: user.id, expiresAt: Date.parse(expiresAt) });
  return token;
}

async function getUser(request) {
  const token = parseCookies(request).courtside_session;
  if (!token) return null;
  let userId;
  if (accounts.usesHostedStorage) {
    userId = await accounts.findSession(hashSessionToken(token));
  } else {
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      sessions.delete(token);
      return null;
    }
    userId = session.userId;
  }
  const user = userId ? await accounts.findById(userId) : null;
  if (!user) {
    if (accounts.usesHostedStorage) await accounts.deleteSession(hashSessionToken(token));
    else sessions.delete(token);
    return null;
  }
  if (!accounts.usesHostedStorage) sessions.get(token).expiresAt = Date.now() + sessionLifetime;
  return user;
}

async function requireUser(request) {
  const user = await getUser(request);
  if (!user) throw new HttpError(401, "Sign in to continue.");
  return user;
}

async function requireAdmin(request) {
  const user = await requireUser(request);
  if (user.role !== "ADMIN") throw new HttpError(403, "Administrator access is required.");
  return user;
}

function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new HttpError(403, "Request origin was rejected.");
  }
  if (parsed.host !== request.headers.host || !["http:", "https:"].includes(parsed.protocol)) {
    throw new HttpError(403, "Request origin was rejected.");
  }
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 2 * 1024 * 1024) throw new HttpError(413, "Request body is too large.");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(value));
}

function sessionCookie(token, request) {
  const secure = request.socket.encrypted || request.headers["x-forwarded-proto"] === "https";
  return `courtside_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionLifetime / 1000}${secure ? "; Secure" : ""}`;
}

function validateState(input) {
  if (!input || typeof input !== "object" || !input.tournament || !Array.isArray(input.teams) || !Array.isArray(input.games)) {
    throw new HttpError(400, "Tournament data is incomplete.");
  }
  const { tournament } = input;
  if (typeof tournament.name !== "string" || !tournament.name.trim() || tournament.name.length > 60) {
    throw new HttpError(400, "Tournament name must be between 1 and 60 characters.");
  }
  if (!["ROUND_ROBIN", "SINGLE_ELIMINATION"].includes(tournament.format)) {
    throw new HttpError(400, "Choose a valid tournament format.");
  }
  if (!Array.isArray(tournament.tiebreakerOrder)
    || tournament.tiebreakerOrder.length !== allowedTiebreakers.size
    || new Set(tournament.tiebreakerOrder).size !== allowedTiebreakers.size
    || tournament.tiebreakerOrder.some((key) => !allowedTiebreakers.has(key))) {
    throw new HttpError(400, "Tiebreaker order is invalid.");
  }

  const teams = input.teams.map((record) => {
    try {
      return new Team(record).toJSON();
    } catch (error) {
      throw new HttpError(400, error.message);
    }
  });
  const teamIds = new Set();
  const playerIds = new Set();
  const teamNames = new Set();
  for (const team of teams) {
    if (teamIds.has(team.id)) throw new HttpError(400, "Team identifiers must be unique.");
    if (teamNames.has(team.name.toLocaleLowerCase())) throw new HttpError(400, "Team names must be unique.");
    teamIds.add(team.id);
    teamNames.add(team.name.toLocaleLowerCase());
    for (const player of team.roster) {
      if (playerIds.has(player.id)) throw new HttpError(400, "A player cannot be assigned to more than one team.");
      playerIds.add(player.id);
    }
    if (team.roster.length > 15) throw new HttpError(400, "A team cannot have more than 15 players.");
  }

  if (input.games.length > 500) throw new HttpError(400, "A tournament cannot contain more than 500 games.");
  const gameIds = new Set();
  const games = input.games.map((record) => {
    if (!teamIds.has(record.homeTeamId) || !teamIds.has(record.awayTeamId)) {
      throw new HttpError(400, "Every game must reference existing teams.");
    }
    if (gameIds.has(record.id)) throw new HttpError(400, "Game identifiers must be unique.");
    gameIds.add(record.id);
    try {
      const game = new Game({
        ...record,
        status: "SCHEDULED",
        winnerTeamId: "",
        events: [],
      });
      for (const event of record.events ?? []) {
        if (event.playerId) {
          const assignedTeam = teams.find((team) => team.roster.some((player) => player.id === event.playerId));
          if (!assignedTeam || assignedTeam.id !== event.teamId) throw new Error("A game event player must belong to the scoring team.");
        }
        game.addEvent(event);
      }
      if (record.status === "FINAL") game.finalize();
      else if (record.status === "LIVE" && game.status !== "LIVE") game.start();
      else if (!["SCHEDULED", "LIVE"].includes(record.status)) throw new Error("Choose a valid game status.");
      return game.toJSON();
    } catch (error) {
      throw new HttpError(400, error.message);
    }
  });
  const scheduledSlots = new Map();
  for (const game of games) {
    if (!game.scheduledAt || game.status === "FINAL") continue;
    const timeSlot = new Date(game.scheduledAt).getTime();
    if (!Number.isFinite(timeSlot)) throw new HttpError(400, "A game has an invalid scheduled date.");
    for (const teamId of [game.homeTeamId, game.awayTeamId]) {
      const key = `${teamId}:${timeSlot}`;
      if (scheduledSlots.has(key)) throw new HttpError(400, "A team cannot have two games in the same time slot.");
      scheduledSlots.set(key, game.id);
    }
  }
  const bracketByes = input.settings?.bracketByes ?? [];
  if (!Array.isArray(bracketByes)) throw new HttpError(400, "Bracket byes must be a list of team identifiers.");

  return {
    tournament: {
      name: tournament.name.trim(),
      format: tournament.format,
      tiebreakerOrder: [...tournament.tiebreakerOrder],
      status: ["SETUP", "IN_PROGRESS", "COMPLETE"].includes(tournament.status) ? tournament.status : "SETUP",
    },
    teams,
    games,
    settings: { bracketByes: bracketByes.filter((id) => teamIds.has(id)) },
  };
}

function rateLimitKey(request, email) {
  return `${request.socket.remoteAddress ?? "unknown"}:${email}`;
}

function recordLoginFailure(key) {
  const entry = loginFailures.get(key) ?? { count: 0, blockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 8) entry.blockedUntil = Date.now() + 15 * 60 * 1000;
  loginFailures.set(key, entry);
}

function checkLoginLimit(key) {
  const entry = loginFailures.get(key);
  if (entry?.blockedUntil > Date.now()) throw new HttpError(429, "Too many sign-in attempts. Try again in 15 minutes.");
  if (entry && entry.blockedUntil <= Date.now() && entry.count >= 8) loginFailures.delete(key);
}

async function handleApi(request, response, url) {
  const { pathname } = url;
  if (request.method === "GET" && pathname === "/api/auth/me") {
    const user = await getUser(request);
    sendJson(response, 200, { user: user ? cleanUser(user) : null });
    return;
  }

  if (request.method === "POST") assertSameOrigin(request);

  if (request.method === "POST" && pathname === "/api/auth/register") {
    const credentials = validateCredentials(await readJson(request), true);
    if (await accounts.findByEmail(credentials.email)) throw new HttpError(409, "An account with that email already exists.");
    const user = {
      id: randomBytes(16).toString("hex"),
      name: credentials.name,
      email: credentials.email,
      role: "VIEWER",
      ...await hashPassword(credentials.password),
      createdAt: new Date().toISOString(),
    };
    try {
      await accounts.create(user);
    } catch (error) {
      if (error instanceof AccountRepositoryError && error.status === 409) {
        throw new HttpError(409, "An account with that email already exists.");
      }
      throw error;
    }
    const token = await createSession(user);
    sendJson(response, 201, { user: cleanUser(user) }, { "Set-Cookie": sessionCookie(token, request) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    const credentials = validateCredentials(await readJson(request));
    const key = rateLimitKey(request, credentials.email);
    checkLoginLimit(key);
    const user = await accounts.findByEmail(credentials.email);
    const candidate = await hashPassword(credentials.password, user?.salt ?? randomBytes(16).toString("hex"));
    const matches = user && timingSafeEqual(Buffer.from(candidate.hash, "hex"), Buffer.from(user.hash, "hex"));
    if (!matches) {
      recordLoginFailure(key);
      throw new HttpError(401, "Email or password is incorrect.");
    }
    loginFailures.delete(key);
    const token = await createSession(user);
    sendJson(response, 200, { user: cleanUser(user) }, { "Set-Cookie": sessionCookie(token, request) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    const token = parseCookies(request).courtside_session;
    if (token) {
      if (accounts.usesHostedStorage) await accounts.deleteSession(hashSessionToken(token));
      else sessions.delete(token);
    }
    const secure = request.socket.encrypted || request.headers["x-forwarded-proto"] === "https";
    sendJson(response, 200, { ok: true }, { "Set-Cookie": `courtside_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? "; Secure" : ""}` });
    return;
  }

  if (request.method === "GET" && pathname === "/api/state") {
    await requireUser(request);
    sendJson(response, 200, { state: store.data.state, revision: store.data.revision });
    return;
  }

  const reopenMatch = pathname.match(/^\/api\/games\/([^/]+)\/reopen$/);
  if (request.method === "POST" && reopenMatch) {
    await requireAdmin(request);
    assertSameOrigin(request);
    const body = await readJson(request);
    if (body.revision !== store.data.revision) {
      throw new HttpError(409, "Tournament data changed in another session. Refresh to load the latest version.");
    }
    const game = store.data.state.games.find((item) => item.id === reopenMatch[1]);
    if (!game) throw new HttpError(404, "Game not found.");
    if (game.status !== "FINAL") throw new HttpError(400, "Only a final game can be reopened.");
    game.status = "LIVE";
    game.winnerTeamId = "";
    store.data.revision += 1;
    await store.save();
    sendJson(response, 200, { revision: store.data.revision });
    return;
  }

  if (request.method === "PUT" && pathname === "/api/state") {
    await requireAdmin(request);
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!Number.isInteger(body.revision) || body.revision !== store.data.revision) {
      throw new HttpError(409, "Tournament data changed in another session. Refresh to load the latest version.");
    }
    const nextState = validateState(body.state);
    for (const previous of store.data.state.games) {
      if (previous.status !== "FINAL") continue;
      const next = nextState.games.find((game) => game.id === previous.id);
      if (!next || next.status !== "FINAL") continue;
      if (previous.homeTeamId !== next.homeTeamId
        || previous.awayTeamId !== next.awayTeamId
        || previous.scheduledAt !== next.scheduledAt
        || previous.court !== next.court
        || JSON.stringify(previous.events) !== JSON.stringify(next.events)) {
        throw new HttpError(409, "Reopen a final game before editing its result or schedule.");
      }
    }
    store.data.state = nextState;
    store.data.revision += 1;
    await store.save();
    sendJson(response, 200, { revision: store.data.revision });
    return;
  }

  if (request.method === "POST" && pathname === "/api/state/reset") {
    await requireAdmin(request);
    assertSameOrigin(request);
    const body = await readJson(request);
    if (body.revision !== store.data.revision) throw new HttpError(409, "Tournament data changed in another session. Refresh to load the latest version.");
    store.data.state = initialState();
    store.data.revision += 1;
    await store.save();
    sendJson(response, 200, { revision: store.data.revision });
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/users") {
    await requireAdmin(request);
    sendJson(response, 200, { users: (await accounts.list()).map(cleanUser) });
    return;
  }

  const roleMatch = pathname.match(/^\/api\/admin\/users\/([a-f0-9]+)\/role$/);
  if (request.method === "PATCH" && roleMatch) {
    const admin = await requireAdmin(request);
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!["ADMIN", "VIEWER"].includes(body.role)) throw new HttpError(400, "Choose a valid account role.");
    const target = await accounts.findById(roleMatch[1]);
    if (!target) throw new HttpError(404, "Account not found.");
    if (target.id === admin.id && body.role !== "ADMIN") throw new HttpError(400, "You cannot remove your own administrator access.");
    if (target.role === "ADMIN" && body.role !== "ADMIN"
      && (await accounts.list()).filter((user) => user.role === "ADMIN").length < 2) {
      throw new HttpError(400, "At least one administrator account must remain.");
    }
    const updated = await accounts.updateRole(target.id, body.role);
    sendJson(response, 200, { user: cleanUser(updated) });
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
};

async function serveStatic(request, response, url) {
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(`${root}${path.sep}`) || relativePath.startsWith("server")) {
    throw new HttpError(404, "File not found.");
  }
  const extension = path.extname(resolved).toLowerCase();
  if (!mimeTypes[extension]) throw new HttpError(404, "File not found.");
  try {
    const contents = await readFile(resolved);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension],
      "Cache-Control": "no-cache",
    });
    response.end(contents);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") throw new HttpError(404, "File not found.");
    throw error;
  }
}

export async function handleRequest(request, response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  try {
    await initialize();
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
    else if (request.method === "GET") await serveStatic(request, response, url);
    else throw new HttpError(405, "Method not allowed.");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error(error);
    const message = initialized || error instanceof AccountRepositoryError || error.code === "MISSING_SUPABASE_CONFIG"
      ? error.message
      : error.message === "No administrator exists. Set ADMIN_EMAIL and a private ADMIN_PASSWORD in .env or the environment, then start the server again."
        ? "Add ADMIN_EMAIL and a private ADMIN_PASSWORD (at least 12 characters) to Vercel Environment Variables."
        : "Server setup failed. Check the Vercel function logs and Supabase configuration.";
    const code = error.code ?? (error instanceof AccountRepositoryError ? "SUPABASE_REQUEST_FAILED" : "SERVER_SETUP_FAILED");
    if (!response.headersSent) sendJson(response, initialized ? status : 503, { error: message, code });
    else response.destroy();
  }
}

if (!process.env.VERCEL) {
  await initialize();
  const server = createServer(handleRequest);
  server.listen(port, host, () => {
    console.log(`Courtside is running at http://${host}:${port}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}

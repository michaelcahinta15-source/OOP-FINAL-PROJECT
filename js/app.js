import { Game } from "./domain/Game.js";
import { GameEvent } from "./domain/GameEvent.js";
import { StorageService } from "./services/StorageService.js?v=3";
import { TournamentService } from "./services/TournamentService.js";
import { SchedulingService } from "./services/SchedulingService.js";
import { ScoringService } from "./services/ScoringService.js";
import { StandingsCalculator } from "./services/StandingsCalculator.js";
import { renderDashboard } from "./ui/dashboard.js?v=2";
import { renderTeams } from "./ui/teams.js";
import { renderSchedule } from "./ui/schedule.js";
import { renderGameConsole } from "./ui/gameConsole.js";
import { renderStandings } from "./ui/standings.js";
import { renderBracket } from "./ui/bracket.js";
import { renderSettings } from "./ui/settings.js";
import { renderAuth } from "./ui/auth.js";
import { renderAdmin } from "./ui/admin.js";

const appShell = document.querySelector(".app-shell");
const authRoot = document.querySelector("#auth-root");
const viewRoot = document.querySelector("#view-root");
const currentSection = document.querySelector("#current-section");
const navigationLinks = document.querySelectorAll("[data-view]");
const signOutButton = document.querySelector("#sign-out");
const storage = new StorageService();
let state;
let committedState = null;
let account = null;
let revision = 0;
let adminUsers = null;
let editingTeamId = "";
let authMode = "login";
let toastTimer;

const viewTitles = {
  dashboard: "Dashboard",
  teams: "Teams",
  schedule: "Schedule",
  standings: "Standings",
  bracket: "Bracket",
  settings: "Settings",
  admin: "Admin",
};

function normalizeState(next) {
  next.tournament ??= { name: "Courtside Invitational", format: "ROUND_ROBIN", tiebreakerOrder: ["HEAD_TO_HEAD", "POINT_DIFFERENTIAL", "POINTS_FOR", "WIN_PERCENTAGE"], status: "SETUP" };
  next.teams ??= [];
  next.games ??= [];
  next.settings ??= {};
  next.settings.bracketByes ??= [];
  return next;
}

async function persist() {
  const savedState = structuredClone(state);
  delete savedState.settings.role;
  try {
    const response = await storage.save(savedState, revision);
    revision = response.revision;
    committedState = structuredClone(state);
  } catch (error) {
    if (error.status === 409) {
      const latest = await storage.load();
      Object.assign(state, normalizeState(latest.state));
      revision = latest.revision;
      committedState = structuredClone(state);
      render();
    } else if (committedState) {
      Object.assign(state, structuredClone(committedState));
      tournament = new TournamentService(state, persist);
      render();
    }
    throw error;
  }
}

const scheduling = new SchedulingService();
const scoring = new ScoringService(() => {
  scheduling.advanceBracket(state);
  state.tournament.status = state.games.length && state.games.every((game) => game.status === "FINAL") ? "COMPLETE" : "IN_PROGRESS";
});
let tournament;
const standingsCalculator = new StandingsCalculator();

function getStandings() {
  return standingsCalculator.calculate(state.teams, state.games, state.tournament.tiebreakerOrder);
}

function getRoute() {
  const hash = window.location.hash.slice(1) || "dashboard";
  return hash.startsWith("game-") ? { view: "game", gameId: hash.slice(5) } : { view: Object.hasOwn(viewTitles, hash) ? hash : "dashboard" };
}

function render() {
  if (!account || !state) return;
  state.settings.role = account.role === "ADMIN" ? "Organizer" : "Viewer";
  document.querySelector("#account-name").textContent = account.name;
  document.querySelector("#account-role").textContent = account.role === "ADMIN" ? "ADMINISTRATOR" : "VIEWER";
  document.querySelector("#account-avatar").textContent = account.name.slice(0, 1).toUpperCase();
  document.querySelector('[data-view="admin"]').hidden = account.role !== "ADMIN";
  const route = getRoute();
  const view = route.view === "admin" && account.role !== "ADMIN" ? "dashboard" : route.view;
  if (view === "admin" && adminUsers === null) {
    viewRoot.innerHTML = `<div class="panel empty-state"><span class="empty-icon">⚑</span><strong>Loading accounts</strong></div>`;
    storage.loadUsers().then((users) => {
      adminUsers = users;
      render();
    }).catch((error) => showMessage(error.message, "error"));
    currentSection.textContent = viewTitles.admin;
    return;
  }
  const activeView = route.view === "game" ? "schedule" : view;
  currentSection.textContent = route.view === "game" ? "Game console" : viewTitles[view];
  for (const link of navigationLinks) {
    const active = link.dataset.view === activeView;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const standings = getStandings();
  switch (view) {
    case "teams": viewRoot.innerHTML = renderTeams(state, state.settings.role, editingTeamId); break;
    case "schedule": viewRoot.innerHTML = renderSchedule(state, state.settings.role, scheduling.findConflicts(state.games)); break;
    case "game": viewRoot.innerHTML = renderGameConsole(state, route.gameId, state.settings.role); break;
    case "standings": viewRoot.innerHTML = renderStandings(standings, state.tournament); break;
    case "bracket": viewRoot.innerHTML = renderBracket(state); break;
    case "settings": viewRoot.innerHTML = renderSettings(state, state.settings.role); break;
    case "admin": viewRoot.innerHTML = renderAdmin(adminUsers ?? [], account.id); break;
    default: viewRoot.innerHTML = renderDashboard(state, standings, account.role === "ADMIN");
  }
}

function renderSignedOut(message = "") {
  account = null;
  state = null;
  authRoot.hidden = false;
  appShell.hidden = true;
  authRoot.innerHTML = renderAuth(authMode, message);
}

async function startSession(user) {
  account = user;
  const result = await storage.load();
  state = normalizeState(result.state);
  revision = result.revision;
  committedState = structuredClone(state);
  tournament = new TournamentService(state, persist);
  adminUsers = null;
  authRoot.hidden = true;
  appShell.hidden = false;
  render();
}

async function boot() {
  try {
    const user = await storage.currentUser();
    if (!user) {
      renderSignedOut();
      return;
    }
    await startSession(user);
  } catch (error) {
    renderSignedOut(`Could not connect to the tournament server: ${error.message}`);
  }
}

function showMessage(message, type = "success") {
  const region = document.querySelector("#toast-region");
  region.textContent = message;
  region.className = `toast toast-${type} visible`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { region.classList.remove("visible"); }, 3500);
}

function requireRole(...roles) {
  if (!roles.includes(state.settings.role)) throw new Error(`This action is not available to the ${state.settings.role} role.`);
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function sampleData() {
  const makeTeam = (name, division, coachFirstName, coachLastName, players) => ({
    id: crypto.randomUUID(), name, division, coach: { id: crypto.randomUUID(), firstName: coachFirstName, lastName: coachLastName, phone: "" },
    roster: players.map(([firstName, lastName, jerseyNumber, position]) => ({ id: crypto.randomUUID(), firstName, lastName, jerseyNumber, position })),
  });
  state.tournament = { name: "Courtside Invitational", format: "ROUND_ROBIN", tiebreakerOrder: ["HEAD_TO_HEAD", "POINT_DIFFERENTIAL", "POINTS_FOR", "WIN_PERCENTAGE"], status: "IN_PROGRESS" };
  state.teams = [
    makeTeam("Northside Falcons", "Varsity", "Morgan", "Lee", [["Avery", "Cole", 4, "Guard"], ["Jordan", "Reed", 12, "Forward"], ["Riley", "Park", 23, "Center"]]),
    makeTeam("East Bay Comets", "Varsity", "Taylor", "Brooks", [["Sam", "Rivera", 3, "Guard"], ["Kai", "Morgan", 8, "Forward"], ["Jamie", "Stone", 15, "Center"]]),
    makeTeam("Downtown Wolves", "Varsity", "Casey", "Bennett", [["Drew", "Hayes", 1, "Guard"], ["Alex", "Kim", 11, "Forward"], ["Cameron", "Diaz", 24, "Center"]]),
    makeTeam("Westside Sparks", "Varsity", "Robin", "Patel", [["Quinn", "Bell", 2, "Guard"], ["Parker", "Wong", 10, "Forward"], ["Emery", "Fox", 21, "Center"]]),
  ];
  state.games = [];
  state.settings.bracketByes = [];
  scheduling.generate(state, "ROUND_ROBIN");
  for (const [index, points] of [[0, [20, 14]], [1, [12, 16]]]) {
    const record = state.games[index];
    const game = new Game(record);
    for (let point = 0; point < points[0] / 2; point += 1) game.addEvent(new GameEvent({ type: "FG2", teamId: game.homeTeamId, period: 1, clock: "08:00" }));
    for (let point = 0; point < points[1] / 2; point += 1) game.addEvent(new GameEvent({ type: "FG2", teamId: game.awayTeamId, period: 1, clock: "07:30" }));
    game.finalize();
    state.games[index] = game.toJSON();
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  try {
    const values = formValues(form);
    switch (form.dataset.form) {
      case "add-team":
        requireRole("Organizer");
        await tournament.addTeam({
          name: values.name,
          division: values.division,
          coach: { firstName: values.coachFirstName, lastName: values.coachLastName },
        });
        showMessage(`${values.name.trim()} added to the tournament.`);
        break;
      case "edit-team":
        requireRole("Organizer");
        await tournament.updateTeam(form.dataset.team, {
          name: values.name,
          division: values.division,
          coach: { firstName: values.coachFirstName, lastName: values.coachLastName },
        });
        editingTeamId = "";
        showMessage("Team details updated.");
        break;
      case "add-player":
        requireRole("Organizer", "Coach");
        if (state.teams.find((team) => team.id === form.dataset.team)?.roster.length >= 15) throw new Error("A team can have at most 15 players.");
        await tournament.addPlayer(form.dataset.team, values);
        showMessage(`${values.firstName.trim()} added to the roster.`);
        break;
      case "generate-schedule":
        requireRole("Organizer");
        scheduling.generate(state, values.format);
        state.tournament.status = "IN_PROGRESS";
        await persist();
        showMessage(`${state.games.length} games generated.`);
        break;
      case "edit-game":
        requireRole("Organizer");
        scheduling.updateGame(state, form.dataset.game, { scheduledAt: new Date(values.scheduledAt).toISOString(), court: values.court.trim() });
        await persist();
        showMessage("Game schedule updated.");
        break;
      case "tournament-settings": {
        requireRole("Organizer");
        const order = [0, 1, 2, 3].map((index) => values[`breaker-${index}`]);
        if (new Set(order).size !== order.length) throw new Error("Each tiebreaker should appear exactly once.");
        if (state.games.length && values.format !== state.tournament.format) throw new Error("Change the format in Schedule when you generate the next schedule.");
        await tournament.updateTournament({ name: values.name.trim(), format: values.format, tiebreakerOrder: order });
        showMessage("Tournament settings saved.");
        break;
      }
      case "account-role": {
        if (account.role !== "ADMIN") throw new Error("Administrator access is required.");
        const updated = await storage.updateUserRole(form.dataset.user, values.role);
        adminUsers = adminUsers.map((user) => user.id === updated.id ? updated : user);
        showMessage(`${updated.name} is now ${updated.role === "ADMIN" ? "an administrator" : "a viewer"}.`);
        break;
      }
      default: return;
    }
    render();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function handleEventButton(button) {
  requireRole("Organizer", "Referee");
  const form = button.closest("form");
  const values = formValues(form);
  const teamId = values.teamId;
  if (values.playerId) {
    const playerTeam = state.teams.find((team) => team.roster.some((item) => item.id === values.playerId));
    if (!playerTeam) throw new Error("Selected player not found.");
    if (playerTeam.id !== teamId) throw new Error("Choose a player from the selected team.");
  }
  scoring.recordEvent(state, button.dataset.game, {
    type: button.dataset.event,
    teamId,
    playerId: values.playerId,
    period: values.period || 1,
    clock: values.clock,
  });
  await persist();
  render();
}

async function handleAction(button) {
  const { action, team: teamId, player: playerId, game: gameId } = button.dataset;
  switch (action) {
    case "edit-team":
      requireRole("Organizer");
      editingTeamId = teamId;
      render();
      break;
    case "cancel-edit":
      editingTeamId = "";
      render();
      break;
    case "delete-team":
      requireRole("Organizer");
      if (window.confirm(state.tournament.format === "SINGLE_ELIMINATION"
        ? "Delete this team and clear the elimination bracket? Generate a new bracket after updating teams."
        : "Delete this team and its scheduled games?")) {
        await tournament.removeTeam(teamId);
        showMessage(state.tournament.format === "SINGLE_ELIMINATION" ? "Team deleted. Regenerate the elimination bracket." : "Team and related games deleted.");
        render();
      }
      break;
    case "remove-player":
      requireRole("Organizer", "Coach");
      await tournament.removePlayer(teamId, playerId);
      showMessage("Player removed from the roster.");
      render();
      break;
    case "record-event":
      await handleEventButton(button);
      break;
    case "undo-event":
      requireRole("Organizer", "Referee");
      scoring.undoLastEvent(state, gameId);
      await persist();
      showMessage("Last event undone.");
      render();
      break;
    case "finalize-game":
      requireRole("Organizer", "Referee");
      scoring.finalize(state, gameId);
      await persist();
      showMessage("Game finalized. Standings have been updated.");
      render();
      break;
    case "reopen-game":
      requireRole("Organizer", "Referee");
      revision = (await storage.reopenGame(gameId, revision)).revision;
      scoring.reopen(state, gameId);
      state.tournament.status = "IN_PROGRESS";
      await persist();
      showMessage("Game reopened. Scores can now be edited.");
      render();
      break;
    case "load-sample":
      requireRole("Organizer");
      sampleData();
      await persist();
      showMessage("Sample tournament loaded.");
      render();
      break;
    case "reset-data":
      requireRole("Organizer");
      if (window.confirm("Reset all Courtside tournament data saved on this server?")) {
        const response = await storage.reset(revision);
        revision = response.revision;
        const loaded = await storage.load();
        Object.assign(state, normalizeState(loaded.state));
        revision = loaded.revision;
        committedState = structuredClone(state);
        editingTeamId = "";
        showMessage("Demo data reset.");
        render();
      }
      break;
    default:
      break;
  }
}

viewRoot.addEventListener("submit", (event) => {
  handleSubmit(event).catch((error) => showMessage(error.message, "error"));
});
viewRoot.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  handleAction(button).catch((error) => showMessage(error.message, "error"));
});
authRoot.addEventListener("click", (event) => {
  const switchButton = event.target.closest('[data-action="switch-auth"]');
  if (!switchButton) return;
  authMode = authMode === "login" ? "register" : "login";
  renderSignedOut();
});
authRoot.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const values = formValues(form);
  try {
    const user = form.dataset.form === "register"
      ? await storage.register(values.name, values.email, values.password)
      : await storage.signIn(values.email, values.password);
    authMode = "login";
    await startSession(user);
  } catch (error) {
    authRoot.innerHTML = renderAuth(authMode, error.message);
  }
});
signOutButton.addEventListener("click", async () => {
  try {
    await storage.signOut();
    window.location.hash = "";
    renderSignedOut();
  } catch (error) {
    showMessage(error.message, "error");
  }
});
window.addEventListener("hashchange", render);
boot();

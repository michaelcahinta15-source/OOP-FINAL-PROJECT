import { escapeHtml, pageHeader } from "./html.js";

export function renderTeams(state, role, editingId = "") {
  const canManageTeams = role === "Organizer";
  const canManageRoster = ["Organizer", "Coach"].includes(role);
  const cards = state.teams.map((team) => `<article class="panel team-card">
    <div class="team-card-heading"><div class="team-avatar">${escapeHtml(team.name.slice(0, 1).toUpperCase())}</div><div class="team-title"><h2>${escapeHtml(team.name)}</h2><span class="tag">${escapeHtml(team.division)}</span></div>
      ${canManageTeams ? `<button class="icon-button danger-text" data-action="delete-team" data-team="${escapeHtml(team.id)}" title="Delete team" aria-label="Delete ${escapeHtml(team.name)}">×</button>` : ""}
    </div>
    ${team.coach ? `<p class="coach-line">Coach <strong>${escapeHtml(`${team.coach.firstName} ${team.coach.lastName}`)}</strong></p>` : `<p class="coach-line muted">No coach assigned</p>`}
    ${editingId === team.id && canManageTeams ? `<form class="team-edit-form form-grid" data-form="edit-team" data-team="${escapeHtml(team.id)}">
      <label>Team name<input name="name" required maxlength="40" value="${escapeHtml(team.name)}"></label><label>Division<input name="division" maxlength="30" value="${escapeHtml(team.division)}"></label>
      <label>Coach first name<input name="coachFirstName" maxlength="35" value="${escapeHtml(team.coach?.firstName ?? "")}"></label><label>Coach last name<input name="coachLastName" maxlength="35" value="${escapeHtml(team.coach?.lastName ?? "")}"></label>
      <div class="form-actions"><button class="button button-secondary" type="button" data-action="cancel-edit">Cancel</button><button class="button button-primary">Save team</button></div>
    </form>` : canManageTeams ? `<button class="button button-quiet" data-action="edit-team" data-team="${escapeHtml(team.id)}">Edit details</button>` : ""}
    <div class="roster-header"><h3>Roster <span>${team.roster.length}</span></h3>${team.roster.length >= 15 ? `<small>Roster limit reached</small>` : ""}</div>
    ${team.roster.length ? `<div class="roster-list">${team.roster.map((player) => `<div class="roster-row"><span class="jersey">#${escapeHtml(player.jerseyNumber)}</span><span class="player-name">${escapeHtml(`${player.firstName} ${player.lastName}`)}<small>${escapeHtml(player.position || "Player")}</small></span>${canManageRoster ? `<button class="icon-button" data-action="remove-player" data-team="${escapeHtml(team.id)}" data-player="${escapeHtml(player.id)}" aria-label="Remove ${escapeHtml(player.firstName)}">−</button>` : ""}</div>`).join("")}</div>` : `<p class="muted small-copy">No players added yet.</p>`}
    ${canManageRoster && team.roster.length < 15 ? `<form class="add-player-form" data-form="add-player" data-team="${escapeHtml(team.id)}">
      <input name="firstName" required maxlength="35" placeholder="First name" aria-label="Player first name">
      <input name="lastName" required maxlength="35" placeholder="Last name" aria-label="Player last name">
      <input name="jerseyNumber" type="number" min="0" max="99" required placeholder="#" aria-label="Jersey number">
      <select name="position" aria-label="Position"><option>Guard</option><option>Forward</option><option>Center</option></select>
      <button class="button button-secondary" type="submit">Add player</button>
    </form>` : ""}
  </article>`).join("");

  return `${pageHeader("Teams & rosters", "Build your lineup and keep every roster game-ready.", canManageTeams ? `<span class="count-pill">${state.teams.length} teams</span>` : "")}
    ${canManageTeams ? `<section class="panel create-team-panel"><div class="panel-heading"><div><h2>Create a team</h2><p>Add a team and optionally assign a coach.</p></div><span class="panel-step">01 / TEAMS</span></div>
      <form class="team-create-form form-grid" data-form="add-team">
        <label>Team name<input name="name" required maxlength="40" placeholder="e.g. Northside Falcons"></label>
        <label>Division<input name="division" maxlength="30" value="Open" placeholder="Open"></label>
        <label>Coach first name<input name="coachFirstName" maxlength="35" placeholder="Optional"></label>
        <label>Coach last name<input name="coachLastName" maxlength="35" placeholder="Optional"></label>
        <div class="form-actions"><button class="button button-primary" type="submit">＋ Create team</button></div>
      </form>
    </section>` : `<div class="notice-banner">You are viewing as ${escapeHtml(role)}. Team creation and deletion are limited to the Organizer.</div>`}
    <div class="team-grid">${cards || `<div class="panel empty-state"><span class="empty-icon">♟</span><strong>No teams yet</strong><p>Create your first team above, or load the sample tournament in Settings.</p><a class="button button-secondary" href="#settings">Open settings</a></div>`}</div>`;
}

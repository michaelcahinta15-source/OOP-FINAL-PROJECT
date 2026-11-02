import { escapeHtml, pageHeader } from "./html.js";

const BREAKERS = [
  ["HEAD_TO_HEAD", "Head-to-head"],
  ["POINT_DIFFERENTIAL", "Point differential"],
  ["POINTS_FOR", "Points for"],
  ["WIN_PERCENTAGE", "Win percentage"],
];

export function renderSettings(state, role) {
  const organizer = role === "Organizer";
  return `${pageHeader("Settings", "Tune your tournament and manage demo data.")}
    <div class="settings-grid">
      <section class="panel"><div class="panel-heading"><div><h2>Tournament setup</h2><p>Basic details used across your workspace.</p></div></div>
        <form class="settings-form" data-form="tournament-settings">
          <label>Tournament name<input name="name" value="${escapeHtml(state.tournament.name)}" maxlength="60" required ${organizer ? "" : "disabled"}></label>
          <label>Default format<select name="format" ${organizer ? "" : "disabled"}><option value="ROUND_ROBIN" ${state.tournament.format === "ROUND_ROBIN" ? "selected" : ""}>Round Robin</option><option value="SINGLE_ELIMINATION" ${state.tournament.format === "SINGLE_ELIMINATION" ? "selected" : ""}>Single Elimination</option></select></label>
          <fieldset><legend>Tiebreaker order</legend><p class="muted small-copy">Wins are always ranked first. Dragging is not required: set the order with the priority menus.</p>
            ${state.tournament.tiebreakerOrder.map((selected, index) => `<label class="breaker-row"><span>${index + 1}</span><select name="breaker-${index}" ${organizer ? "" : "disabled"}>${BREAKERS.map(([key, label]) => `<option value="${key}" ${selected === key ? "selected" : ""}>${label}</option>`).join("")}</select></label>`).join("")}
          </fieldset>
          ${organizer ? `<button class="button button-primary">Save tournament settings</button>` : `<div class="notice-banner">Only the Organizer can change tournament settings.</div>`}
        </form>
      </section>
      <section class="panel"><div class="panel-heading"><div><h2>Demo data</h2><p>Quickly populate or clear the tournament saved on this server.</p></div></div>
        <div class="data-actions"><div><strong>Load sample tournament</strong><p>Four teams, a schedule, and example final scores.</p><button class="button button-secondary" data-action="load-sample" ${organizer ? "" : "disabled"}>Load sample data</button></div>
          <div class="danger-zone"><strong>Reset all data</strong><p>Remove tournament data from this browser.</p><button class="button button-danger" data-action="reset-data" ${organizer ? "" : "disabled"}>Reset demo data</button></div>
        </div>
        ${!organizer ? `<div class="notice-banner">Switch to Organizer to load or reset data.</div>` : ""}
      </section>
      <section class="panel about-panel"><div class="panel-heading"><div><h2>About this project</h2><p>Browser-native interface backed by the Courtside server.</p></div></div><div class="about-metrics"><span><strong>ES2022</strong>JavaScript</span><span><strong>JSON</strong>File store</span><span><strong>Accounts</strong>Session-based</span></div><p class="muted small-copy">Only signed-in accounts can view tournament data. Administrators control edits and account roles.</p></section>
    </div>`;
}

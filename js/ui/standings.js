import { escapeHtml, pageHeader } from "./html.js";

export function renderStandings(standings, tournament) {
  const divisions = [...new Set(standings.map((standing) => standing.team.division))];
  return `${pageHeader("Standings", "Team records update automatically when a game is finalized.", `<span class="count-pill">${standings.length} teams ranked</span>`)}
    ${divisions.length ? divisions.map((division) => {
      const rows = standings.filter((standing) => standing.team.division === division);
      return `<section class="panel standings-panel"><div class="panel-heading"><div><h2>${escapeHtml(division)} division</h2><p>Ranked by wins, then your configured tiebreaker chain.</p></div></div>
        <div class="table-scroll"><table><thead><tr><th>RANK</th><th>TEAM</th><th>W</th><th>L</th><th>WIN %</th><th>PF</th><th>PA</th><th>DIFF</th><th>STREAK</th></tr></thead><tbody>
        ${rows.map((row) => `<tr><td><span class="rank-badge ${row.rank === 1 ? "rank-first" : ""}">${row.rank}</span></td><td class="table-team">${escapeHtml(row.team.name)}</td><td>${row.wins}</td><td>${row.losses}</td><td>${(row.winPct * 100).toFixed(1)}%</td><td>${row.pointsFor}</td><td>${row.pointsAgainst}</td><td class="${row.pointDiff > 0 ? "positive" : row.pointDiff < 0 ? "negative" : ""}">${row.pointDiff > 0 ? "+" : ""}${row.pointDiff}</td><td><span class="streak">${row.streak || "—"}</span></td></tr>`).join("")}
        </tbody></table></div></section>`;
    }).join("") : `<div class="panel empty-state"><span class="empty-icon">↗</span><strong>No standings yet</strong><p>Add teams and finalize games to calculate the table.</p><a class="button button-secondary" href="#teams">Manage teams</a></div>`}
    <p class="footnote">Tiebreaker order: ${tournament.tiebreakerOrder.map((key) => escapeHtml(key.replaceAll("_", " ").toLowerCase())).join(" → ")}</p>`;
}

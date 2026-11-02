export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function pageHeader(title, description, actions = "") {
  return `<div class="page-title-row"><div><p class="eyebrow">COURTSIDE / TOURNAMENT</p><h1 class="page-heading">${escapeHtml(title)}</h1><p class="page-description">${escapeHtml(description)}</p></div>${actions}</div>`;
}

export function teamName(state, teamId) {
  return escapeHtml(state.teams.find((team) => team.id === teamId)?.name ?? "Unknown team");
}

export function formatDate(value, options = {}) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : new Intl.DateTimeFormat(undefined, options).format(date);
}

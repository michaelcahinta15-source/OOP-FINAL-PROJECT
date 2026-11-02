import { escapeHtml, pageHeader } from "./html.js";

export function renderAdmin(users, currentUserId) {
  return `${pageHeader("Admin view", "Manage access to the tournament workspace.", `<span class="count-pill">${users.length} accounts</span>`)}
    <div class="notice-banner">New sign-ups have read-only viewer access. Only administrators can change account roles or tournament data.</div>
    <section class="panel admin-panel"><div class="panel-heading"><div><h2>Accounts</h2><p>Promote trusted accounts to administrator or return them to viewer access.</p></div><span class="panel-step">ADMINISTRATOR</span></div>
      ${users.length ? `<div class="table-scroll"><table><thead><tr><th>ACCOUNT</th><th>EMAIL</th><th>ROLE</th><th>ACCESS</th></tr></thead><tbody>
        ${users.map((user) => `<tr><td class="table-team">${escapeHtml(user.name)}${user.id === currentUserId ? ` <span class="you-tag">YOU</span>` : ""}</td><td class="email-cell">${escapeHtml(user.email)}</td><td><span class="status ${user.role === "ADMIN" ? "status-live" : ""}">${user.role === "ADMIN" ? "ADMIN" : "VIEWER"}</span></td><td>
          ${user.id === currentUserId ? `<span class="muted small-copy">Current account</span>` : `<form class="role-update-form" data-form="account-role" data-user="${escapeHtml(user.id)}"><select name="role" aria-label="Role for ${escapeHtml(user.name)}"><option value="VIEWER" ${user.role === "VIEWER" ? "selected" : ""}>Viewer</option><option value="ADMIN" ${user.role === "ADMIN" ? "selected" : ""}>Administrator</option></select><button class="button button-secondary">Save role</button></form>`}
        </td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty-state"><strong>No accounts found</strong></div>`}
    </section>`;
}

import { escapeHtml } from "./html.js";

export function renderAuth(mode = "login", message = "") {
  const registering = mode === "register";
  return `<div class="auth-layout">
    <div class="auth-brand"><span class="brand-mark">C</span><strong>COURTSIDE</strong></div>
    <section class="auth-card">
      <p class="eyebrow">BASKETBALL TOURNAMENTS</p>
      <h1>${registering ? "Create your viewer account" : "Welcome back"}</h1>
      <p class="page-description">${registering ? "Register with your Gmail or another email address to follow tournament teams, schedules, and results." : "Sign in to your Courtside account to continue."}</p>
      ${message ? `<div class="alert alert-warning auth-message" role="alert">${escapeHtml(message)}</div>` : ""}
      <form class="auth-form" data-form="${registering ? "register" : "login"}">
        ${registering ? `<label>Your name<input name="name" autocomplete="name" minlength="2" maxlength="70" required></label>` : ""}
        <label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" placeholder="${registering ? "you@gmail.com" : "you@example.com"}" required></label>
        <label>Password<input name="password" type="password" autocomplete="${registering ? "new-password" : "current-password"}" minlength="12" maxlength="256" required></label>
        ${registering ? `<small class="password-hint">Use at least 12 characters. New accounts can view the tournament. Email ownership is not verified.</small>` : ""}
        <button class="button button-primary auth-submit" type="submit">${registering ? "Create viewer account" : "Sign in"}</button>
      </form>
      <p class="auth-switch">${registering ? "Already have an account?" : "Need a viewer account?"}
        <button class="text-button" type="button" data-action="switch-auth">${registering ? "Sign in" : "Create account"}</button>
      </p>
    </section>
    <p class="auth-footnote">Tournament administration is restricted to approved administrator accounts.</p>
  </div>`;
}

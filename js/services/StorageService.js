export class StorageService {
  async #request(path, { method = "GET", body } = {}) {
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error ?? `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return result;
  }

  async currentUser() {
    return (await this.#request("/api/auth/me")).user;
  }

  async signIn(email, password) {
    return (await this.#request("/api/auth/login", { method: "POST", body: { email, password } })).user;
  }

  async register(name, email, password) {
    return (await this.#request("/api/auth/register", { method: "POST", body: { name, email, password } })).user;
  }

  async signOut() {
    await this.#request("/api/auth/logout", { method: "POST", body: {} });
  }

  async load() {
    return this.#request("/api/state");
  }

  async save(state, revision) {
    return this.#request("/api/state", { method: "PUT", body: { state, revision } });
  }

  async reset(revision) {
    return this.#request("/api/state/reset", { method: "POST", body: { revision } });
  }

  async reopenGame(gameId, revision) {
    return this.#request(`/api/games/${encodeURIComponent(gameId)}/reopen`, {
      method: "POST",
      body: { revision },
    });
  }

  async loadUsers() {
    return (await this.#request("/api/admin/users")).users;
  }

  async updateUserRole(userId, role) {
    return (await this.#request(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
      method: "PATCH",
      body: { role },
    })).user;
  }
}

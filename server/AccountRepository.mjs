export class AccountRepositoryError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export class AccountRepository {
  #store;
  #url;
  #key;
  #remote;

  constructor(store, { url = "", key = "" } = {}) {
    if (Boolean(url) !== Boolean(key)) {
      throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable hosted account storage.");
    }
    this.#store = store;
    this.#url = url.replace(/\/+$/, "");
    this.#key = key;
    this.#remote = Boolean(url && key);
  }

  get usesHostedStorage() {
    return this.#remote;
  }

  async list() {
    if (!this.#remote) return this.#store.data.users;
    const records = await this.#request("courtside_accounts?select=*&order=created_at.asc");
    return records.map(fromRecord);
  }

  async findById(id) {
    if (!this.#remote) return this.#store.data.users.find((user) => user.id === id) ?? null;
    const records = await this.#request(`courtside_accounts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
    return records.length ? fromRecord(records[0]) : null;
  }

  async findByEmail(email) {
    if (!this.#remote) return this.#store.data.users.find((user) => user.email === email) ?? null;
    const records = await this.#request(`courtside_accounts?email=eq.${encodeURIComponent(email)}&select=*&limit=1`);
    return records.length ? fromRecord(records[0]) : null;
  }

  async create(user) {
    if (!this.#remote) {
      if (this.#store.data.users.some((existing) => existing.email === user.email)) {
        throw new AccountRepositoryError(409, "Account already exists.");
      }
      this.#store.data.users.push(user);
      await this.#store.save();
      return user;
    }

    const records = await this.#request("courtside_accounts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(toRecord(user)),
    });
    return fromRecord(records[0]);
  }

  async updateRole(id, role) {
    if (!this.#remote) {
      const user = this.#store.data.users.find((item) => item.id === id);
      if (!user) return null;
      user.role = role;
      await this.#store.save();
      return user;
    }

    const records = await this.#request(`courtside_accounts?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ role }),
    });
    return records.length ? fromRecord(records[0]) : null;
  }

  async createSession(tokenHash, userId, expiresAt) {
    if (!this.#remote) return;
    await this.#request("courtside_sessions", {
      method: "POST",
      body: JSON.stringify({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt }),
    });
  }

  async findSession(tokenHash) {
    if (!this.#remote) return null;
    const records = await this.#request(
      `courtside_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}&select=user_id,expires_at&limit=1`,
    );
    if (!records.length) return null;
    if (Date.parse(records[0].expires_at) <= Date.now()) {
      await this.deleteSession(tokenHash);
      return null;
    }
    return records[0].user_id;
  }

  async deleteSession(tokenHash) {
    if (!this.#remote) return;
    await this.#request(`courtside_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}`, {
      method: "DELETE",
    });
  }

  async #request(endpoint, options = {}) {
    const response = await fetch(`${this.#url}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        apikey: this.#key,
        Authorization: `Bearer ${this.#key}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const contents = await response.text();
    let result;
    try {
      result = contents ? JSON.parse(contents) : [];
    } catch {
      throw new Error("Hosted account storage returned an invalid response.");
    }
    if (!response.ok) {
      if (response.status === 409 || result.code === "23505") {
        throw new AccountRepositoryError(409, "Account already exists.");
      }
      throw new Error(`Hosted account storage request failed (${response.status}): ${result.message ?? response.statusText}`);
    }
    return result;
  }
}

function toRecord(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    salt: user.salt,
    password_hash: user.hash,
    created_at: user.createdAt,
  };
}

function fromRecord(record) {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    salt: record.salt,
    hash: record.password_hash,
    createdAt: record.created_at,
  };
}

// ============================================================
// STORE.JS — everything persists in the browser's localStorage.
// No backend, no accounts syncing across devices — this is
// scoped to one browser only.
//
// Keys:
//   cn_users    -> array of { id, name, email, passwordHash }
//   cn_session  -> { userId }            (who's currently signed in)
//   cn_notes    -> array of note objects, each tagged with uid
//
// This is the ONE place that reads/writes identity + notes, which
// is what keeps "who's logged in" consistent everywhere in the app.
// ============================================================

const DB = {
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  _write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // ---------- users ----------
  getUsers() { return this._read('cn_users', []); },
  saveUsers(users) { this._write('cn_users', users); },
  findUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById(id) {
    return this.getUsers().find(u => u.id === id);
  },
  createUser({ name, email, password }) {
    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('That email is already registered — try signing in instead.');
    }
    const user = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name,
      email,
      passwordHash: simpleHash(password),
      createdAt: Date.now()
    };
    users.push(user);
    this.saveUsers(users);
    return user;
  },
  verifyLogin(email, password) {
    const user = this.findUserByEmail(email);
    if (!user) throw new Error('No account found with that email.');
    if (user.passwordHash !== simpleHash(password)) throw new Error('Incorrect password.');
    return user;
  },
  updateUserName(userId, name) {
    const users = this.getUsers();
    const u = users.find(x => x.id === userId);
    if (u) { u.name = name; this.saveUsers(users); }
  },

  // ---------- session ----------
  getSession() { return this._read('cn_session', null); },
  setSession(userId) { this._write('cn_session', { userId }); },
  clearSession() { localStorage.removeItem('cn_session'); },
  getCurrentUser() {
    const s = this.getSession();
    if (!s) return null;
    return this.findUserById(s.userId) || null;
  },

  // ---------- notes ----------
  getAllNotes() { return this._read('cn_notes', []); },
  saveAllNotes(notes) { this._write('cn_notes', notes); },
  getNotesForUser(uid) { return this.getAllNotes().filter(n => n.uid === uid); },
  addNote(note) {
    const notes = this.getAllNotes();
    const withId = { id: 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), ...note };
    notes.push(withId);
    this.saveAllNotes(notes);
    return withId;
  },
  updateNote(id, patch) {
    const notes = this.getAllNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) { notes[idx] = { ...notes[idx], ...patch }; this.saveAllNotes(notes); }
  },
  deleteNote(id) {
    this.saveAllNotes(this.getAllNotes().filter(n => n.id !== id));
  }
};

// NOTE: this is a lightweight, non-cryptographic hash meant only to
// avoid storing plaintext passwords in localStorage for this local-only
// demo app. It is NOT secure enough for a real multi-user product —
// if you ever add a real backend, use proper password hashing there.
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return 'h_' + hash.toString(36) + '_' + str.length;
}

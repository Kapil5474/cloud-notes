# Cloud Notes — local storage edition

No Firebase, no backend, no build step. Everything — accounts, sessions, and
notes — lives in your browser's `localStorage`. Just open `index.html`.

## Why the "admin" name bug happened (and how this build avoids it)
In a multi-page site, each page independently pulls "who's logged in," and
it's easy for one page to fall back to a placeholder/seed value (like
`"admin"`) if that page's lookup is missing or reading from the wrong place.

This build is a **single HTML page** (`app.html`) with sections toggled by
JavaScript — there's no page navigation at all, so there's only one function,
`renderProfile()`, that ever writes a name into the UI. It always reads from
the current `localStorage` session (see `js/store.js`), which points at your
own account record. Nothing else is allowed to hardcode a name.

## Running it
No server needed — just open `index.html` in a browser. (Some browsers
restrict `localStorage` on `file://` pages; if that happens, serve the folder
locally instead, e.g. `npx serve .` from this folder, then visit the URL it
gives you.)

## How data is stored
- `cn_users` — array of accounts: `{ id, name, email, passwordHash }`
- `cn_session` — which account is currently signed in
- `cn_notes` — all notes, each tagged with the `uid` of its owner

Everything is scoped to **one browser, on one device**. Clearing your
browser's site data (or using a different browser/incognito window) means a
fresh, empty account list.

## Important limits of this approach
- **Not secure for real accounts.** Passwords are hashed with a simple,
  non-cryptographic hash — good enough to avoid storing plaintext locally,
  but not real security. Don't reuse a real password here.
- **No sync across devices.** Since there's no server, your notes only exist
  in the browser you created them in.
- **Storage cap.** `localStorage` typically allows a few MB total, so file
  uploads are capped around 2 MB per file.

## Want it to sync across devices later?
Swap `js/store.js` for calls to a real backend (Firebase, Supabase, your own
API, etc.) — `app.js` and `auth.js` only ever talk to the `DB` object, so
that's the one file you'd need to replace.

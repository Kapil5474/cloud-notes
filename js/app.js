// ============================================================
// APP.JS
// Everything lives in ONE page. Sections are just <section> divs
// shown/hidden with JS — there is no page reload between them,
// so there is exactly one place that renders "who is logged in".
// That single function (renderProfile) reads straight from the
// current localStorage session — nothing else is allowed to
// hardcode or guess a name, which is what stops "admin" (or
// anyone else) from ever showing up in your profile.
//
// Data lives entirely in this browser's localStorage (see store.js).
// There's no server, so notes don't sync across devices/browsers.
// ============================================================

let currentUser = null;   // { id, name, email, ... }
let allNotes = [];        // cached notes for the signed-in user
let toastTimer;           // declared up top so showToast() can be called anytime, even during init

// ---------- auth guard ----------
currentUser = DB.getCurrentUser();
if (!currentUser) {
  window.location.href = 'index.html';
} else {
  renderProfile();
  refreshNotes();
  initNav();
  initForms();
  showSection('dashboard');
}

// single source of truth for identity in the UI
function renderProfile() {
  const name = currentUser?.name || 'You';
  const email = currentUser?.email || '';
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  document.getElementById('chip-name').textContent = name;
  document.getElementById('chip-email').textContent = email;
  document.getElementById('chip-avatar').textContent = initial;
  document.getElementById('topbar-name').textContent = name;
  document.getElementById('profile-name-display').textContent = name;
  document.getElementById('profile-email-display').textContent = email;
  document.getElementById('profile-avatar').textContent = initial;
  const pfName = document.getElementById('pf-name');
  if (pfName) pfName.value = name;
}

// ---------- nav / section switching ----------
function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });
  document.getElementById('logout-btn').addEventListener('click', () => {
    DB.clearSession();
    window.location.href = 'index.html';
  });
}

const sectionTitles = {
  dashboard: 'Dashboard', notes: 'My Notes', create: 'Create Note',
  upload: 'Upload Note', subjects: 'Subjects', favorites: 'Favorites', profile: 'Profile'
};

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
  document.getElementById('section-' + name).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === name));
  document.getElementById('section-title').textContent = sectionTitles[name];
  renderProfile(); // re-assert identity every time a section is entered
  refreshNotes();
  if (name === 'subjects') renderSubjects();
  if (name === 'favorites') renderFavorites();
}

// ---------- notes: read straight from localStorage, scoped to this user ----------
function refreshNotes() {
  allNotes = DB.getNotesForUser(currentUser.id);
  renderDashboard();
  renderNotesTable();
  populateSubjectFilter();
}

// ---------- dashboard ----------
function renderDashboard() {
  document.getElementById('stat-total').textContent = allNotes.length;
  document.getElementById('stat-uploaded').textContent = allNotes.filter(n => n.isUpload).length;
  document.getElementById('stat-fav').textContent = allNotes.filter(n => n.favorite).length;
  const subjects = new Set(allNotes.map(n => n.subject).filter(Boolean));
  document.getElementById('stat-subjects').textContent = subjects.size;

  const recentEl = document.getElementById('dashboard-recent');
  const recent = [...allNotes].sort(sortByNewest).slice(0, 5);
  if (recent.length === 0) {
    recentEl.innerHTML = '<div class="empty-state"><div class="big">📝</div><h3>No notes yet</h3><p>Create your first note to see it here.</p></div>';
    return;
  }
  recentEl.innerHTML = recent.map(n => `
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--paper-line);">
      <div>
        <div class="note-title-cell">${escapeHtml(n.title)}</div>
        <div style="font-size:12px;color:var(--paper-muted);">${escapeHtml(n.subject || '—')}</div>
      </div>
      <div style="font-size:12px;color:var(--paper-muted);">${formatDate(n.createdAt)}</div>
    </div>`).join('');
}

function sortByNewest(a, b) {
  return (b.createdAt || 0) - (a.createdAt || 0);
}

// ---------- my notes table ----------
function populateSubjectFilter() {
  const sel = document.getElementById('filter-subject');
  const current = sel.value;
  const subjects = [...new Set(allNotes.map(n => n.subject).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">All Subjects</option>' + subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  sel.value = current;
}

function getFilteredSortedNotes() {
  const q = document.getElementById('notes-search').value.trim().toLowerCase();
  const subj = document.getElementById('filter-subject').value;
  const pri = document.getElementById('filter-priority').value;
  const fav = document.getElementById('filter-fav').value;
  const sort = document.getElementById('sort-order').value;

  let list = allNotes.filter(n => {
    if (q && !(`${n.title} ${n.description || ''} ${n.tags || ''}`.toLowerCase().includes(q))) return false;
    if (subj && n.subject !== subj) return false;
    if (pri && n.priority !== pri) return false;
    if (fav === 'fav' && !n.favorite) return false;
    if (fav === 'notfav' && n.favorite) return false;
    return true;
  });

  if (sort === 'newest') list.sort(sortByNewest);
  if (sort === 'oldest') list.sort((a, b) => -sortByNewest(a, b));
  if (sort === 'title-az') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  if (sort === 'title-za') list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
  return list;
}

function renderNotesTable() {
  const tbody = document.getElementById('notes-tbody');
  const list = getFilteredSortedNotes();
  document.getElementById('notes-count').textContent = `Showing ${list.length} note${list.length === 1 ? '' : 's'}`;
  document.getElementById('notes-empty').style.display = list.length ? 'none' : 'block';
  tbody.innerHTML = list.map(n => noteRowHtml(n)).join('');
}

function noteRowHtml(n) {
  const badgeClass = n.priority === 'Very Important' ? 'badge-very' : n.priority === 'Important' ? 'badge-important' : 'badge-normal';
  return `
    <tr>
      <td class="note-title-cell">${escapeHtml(n.title)}</td>
      <td>${escapeHtml(n.subject || '—')}</td>
      <td>${n.isUpload ? '📁 File' : '📝 Note'}</td>
      <td><span class="badge ${badgeClass}">${escapeHtml(n.priority || 'Normal')}</span></td>
      <td>${formatDate(n.createdAt)}</td>
      <td>
        <button class="icon-btn" title="View" onclick="viewNote('${n.id}')">👁</button>
        <button class="icon-btn" title="Favorite" onclick="toggleFavorite('${n.id}', ${!n.favorite})">${n.favorite ? '★' : '☆'}</button>
        <button class="icon-btn" title="Delete" onclick="deleteNote('${n.id}')">🗑</button>
      </td>
    </tr>`;
}

// elements already exist in the DOM since this script tag sits at the end of <body>
['notes-search', 'filter-subject', 'filter-priority', 'filter-fav', 'sort-order'].forEach(id => {
  const el = document.getElementById(id);
  el?.addEventListener('input', renderNotesTable);
  el?.addEventListener('change', renderNotesTable);
});

// ---------- subjects ----------
function renderSubjects() {
  const panel = document.getElementById('subjects-panel');
  const groups = {};
  allNotes.forEach(n => {
    const s = n.subject || 'Uncategorized';
    (groups[s] ||= []).push(n);
  });
  const keys = Object.keys(groups).sort();
  if (keys.length === 0) {
    panel.innerHTML = '<div class="empty-state"><div class="big">▦</div><h3>No subjects yet</h3><p>Notes you create will be grouped here by subject.</p></div>';
    return;
  }
  panel.innerHTML = keys.map(s => `
    <div class="subject-group">
      <h3>${escapeHtml(s)} <span class="subject-count">${groups[s].length}</span></h3>
      <table class="notes-table">
        <thead><tr><th>Note</th><th>Type</th><th>Priority</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>${groups[s].map(n => `
          <tr>
            <td class="note-title-cell">${escapeHtml(n.title)}</td>
            <td>${n.isUpload ? '📁 File' : '📝 Note'}</td>
            <td><span class="badge ${n.priority === 'Very Important' ? 'badge-very' : n.priority === 'Important' ? 'badge-important' : 'badge-normal'}">${escapeHtml(n.priority || 'Normal')}</span></td>
            <td>${formatDate(n.createdAt)}</td>
            <td><button class="icon-btn" onclick="viewNote('${n.id}')">👁</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

// ---------- favorites ----------
function renderFavorites() {
  const tbody = document.getElementById('fav-tbody');
  const favs = allNotes.filter(n => n.favorite).sort(sortByNewest);
  document.getElementById('fav-empty').style.display = favs.length ? 'none' : 'block';
  tbody.innerHTML = favs.map(n => noteRowHtml(n)).join('');
}

// ---------- create / upload / edit / delete ----------
function initForms() {
  document.getElementById('create-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const note = {
      uid: currentUser.id,
      title: document.getElementById('cf-title').value.trim(),
      subject: document.getElementById('cf-subject').value.trim(),
      unit: document.getElementById('cf-unit').value.trim(),
      priority: document.getElementById('cf-priority').value,
      tags: document.getElementById('cf-tags').value.trim(),
      description: document.getElementById('cf-desc').value.trim(),
      content: document.getElementById('cf-content').value,
      favorite: document.getElementById('cf-fav').checked,
      isUpload: false,
      createdAt: Date.now()
    };
    try {
      DB.addNote(note);
      e.target.reset();
      showToast('Note saved ✓');
      showSection('notes');
    } catch (err) { showToast('Error: ' + err.message); }
  });

  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('uf-file');
    const file = fileInput.files[0];
    const title = document.getElementById('uf-title').value.trim();
    const subject = document.getElementById('uf-subject').value.trim();

    if (!file) { showToast('Choose a file first.'); return; }
    if (!title) { showToast('Give the note a title.'); return; }
    if (!subject) { showToast('Add a subject.'); return; }
    if (file.size > 700 * 1024) {
      showToast(`"${file.name}" is ${(file.size/1024/1024).toFixed(1)} MB — over the ~700 KB limit for browser storage.`);
      return;
    }

    const submitBtn = e.target.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    try {
      const base64 = await fileToBase64(file);
      DB.addNote({
        uid: currentUser.id,
        title,
        subject,
        priority: document.getElementById('uf-priority').value,
        content: `[Uploaded file: ${file.name}]`,
        fileName: file.name,
        fileType: file.type,
        fileData: base64,
        favorite: false,
        isUpload: true,
        createdAt: Date.now()
      });
      e.target.reset();
      showToast('File uploaded ✓');
      showSection('notes');
    } catch (err) {
      if (err.name === 'QuotaExceededError' || /quota/i.test(err.message)) {
        showToast('Browser storage is full. Delete a few notes/files and try again.');
      } else {
        showToast('Upload failed: ' + err.message);
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = document.getElementById('pf-name').value.trim();
    if (!newName) return;
    DB.updateUserName(currentUser.id, newName);
    currentUser.name = newName;
    renderProfile();
    showToast('Profile updated ✓');
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toggleFavorite(id, value) {
  DB.updateNote(id, { favorite: value });
  refreshNotes();
  renderFavorites();
}

function deleteNote(id) {
  if (!confirm('Delete this note? This cannot be undone.')) return;
  DB.deleteNote(id);
  refreshNotes();
  renderFavorites();
  showToast('Note deleted');
}

function viewNote(id) {
  const n = allNotes.find(x => x.id === id);
  if (!n) return;
  document.getElementById('vm-title').textContent = n.title;
  document.getElementById('vm-meta').textContent = `${n.subject || '—'} · ${n.priority || 'Normal'} · ${formatDate(n.createdAt)}`;
  if (n.isUpload && n.fileData) {
    document.getElementById('vm-content').innerHTML = n.fileType?.startsWith('image/')
      ? `<img src="${n.fileData}" style="max-width:100%;border-radius:6px;">`
      : `<a href="${n.fileData}" download="${escapeHtml(n.fileName || 'file')}" class="btn btn-teal">⬇ Download ${escapeHtml(n.fileName || 'file')}</a>`;
  } else {
    document.getElementById('vm-content').textContent = n.content || '';
  }
  document.getElementById('view-modal').style.display = 'flex';
}
function closeViewModal() { document.getElementById('view-modal').style.display = 'none'; }

// ---------- utils ----------
function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
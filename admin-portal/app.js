/**
 * Admin Portal – Vanilla JS
 * Completely standalone from the chatbot frontend.
 * Talks directly to the FastAPI backend at http://localhost:8000
 */

const API = 'http://localhost:8000/api/v1';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const ADMIN_TOKEN_KEY = 'admin_access_token';
const ADMIN_EMAIL_KEY = 'admin_email';

// ─── State ────────────────────────────────────────────────────────────────────
let allDocs    = [];   // full list from API
let toDeleteId = null;
let toDeleteName = '';
let progressTimer = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function adminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY); }

async function apiFetch(path, opts = {}) {
    const token = adminToken();
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API}${path}`, { ...opts, headers });
    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const j = await res.json(); detail = j.detail || detail; } catch {}
        throw new Error(detail);
    }
    if (res.status === 204) return null;
    return res.json();
}

function showToast(msg, type = 'success') {
    const t = $('toast');
    t.textContent = msg;
    t.className = `toast ${type}`;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), 3500);
}

function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status) {
    const map = {
        indexed:    ['s-indexed',    '✓ Indexed'],
        pending:    ['s-pending',    '⏳ Pending'],
        processing: ['s-processing', '⟳ Processing'],
        failed:     ['s-failed',     '✕ Failed'],
    };
    const [cls, label] = map[status] || ['s-pending', status];
    return `<span class="badge-status ${cls}">${label}</span>`;
}

// ─── Screens ──────────────────────────────────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

// ─── Login ────────────────────────────────────────────────────────────────────
function setLoginBusy(busy) {
    $('login-btn').disabled = busy;
    $('login-btn').querySelector('.btn-text').classList.toggle('hidden', busy);
    $('login-btn').querySelector('.btn-loader').classList.toggle('hidden', !busy);
}

$('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = $('login-email').value.trim();
    const password = $('login-password').value;
    const errEl    = $('login-error');
    errEl.classList.add('hidden');
    setLoginBusy(true);

    try {
        const data = await apiFetch('/auth/admin/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
        localStorage.setItem(ADMIN_EMAIL_KEY, email);
        enterDashboard(email);
    } catch (err) {
        errEl.textContent = err.message === 'Admin access required'
            ? '⛔ This account does not have admin privileges.'
            : err.message;
        errEl.classList.remove('hidden');
    } finally {
        setLoginBusy(false);
    }
});

// ─── Dashboard init ───────────────────────────────────────────────────────────
function enterDashboard(email) {
    $('admin-email-display').textContent = email;
    showScreen('dashboard-screen');
    loadDocs();
}

$('logout-btn').addEventListener('click', () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_EMAIL_KEY);
    showScreen('login-screen');
    $('login-form').reset();
    $('login-error').classList.add('hidden');
});

// ─── Document list ────────────────────────────────────────────────────────────
async function loadDocs() {
    showTableState('loading');
    try {
        const statusFilter = $('status-filter').value;
        let url = '/documents?limit=100';
        if (statusFilter) url += `&status_filter=${statusFilter}`;
        allDocs = await apiFetch(url);
        renderTable();
    } catch (err) {
        showToast('Failed to load documents: ' + err.message, 'error');
        showTableState('empty');
    }
}

function showTableState(state) {
    $('table-loading').classList.add('hidden');
    $('table-empty').classList.add('hidden');
    $('doc-table').classList.add('hidden');

    if (state === 'loading') $('table-loading').classList.remove('hidden');
    else if (state === 'empty') $('table-empty').classList.remove('hidden');
    else $('doc-table').classList.remove('hidden');
}

function renderTable() {
    const search = $('search-input').value.toLowerCase();
    const filtered = allDocs.filter(d => {
        if (!search) return true;
        return (d.filename + d.device_type + d.brand + (d.model || '')).toLowerCase().includes(search);
    });

    $('doc-count-badge').textContent = allDocs.length;

    if (filtered.length === 0) { showTableState('empty'); return; }
    showTableState('table');

    const tbody = $('doc-tbody');
    tbody.innerHTML = filtered.map(doc => `
        <tr class="row-appear">
            <td>
                <div class="fn-cell">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span title="${doc.filename}">${doc.filename}</span>
                </div>
            </td>
            <td>${doc.device_type}</td>
            <td>${doc.brand}</td>
            <td>${doc.model ? doc.model : '<span class="muted-val">—</span>'}</td>
            <td style="text-align:center">${doc.chunks_count ?? '—'}</td>
            <td style="text-align:center">${formatDate(doc.uploaded_at)}</td>
            <td>${statusBadge(doc.status)}</td>
            <td>
                <div class="actions-cell">
                    ${doc.status === 'failed' ? `
                        <button class="icon-btn accent" onclick="reindexDoc('${doc.document_id}')" title="Re-index">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        </button>` : ''}
                    <button class="icon-btn danger" onclick="openDeleteModal('${doc.document_id}', '${doc.filename.replace(/'/g, "\\'")}')" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Filters
$('search-input').addEventListener('input', () => {
    const hasVal = $('search-input').value.length > 0;
    $('clear-search').classList.toggle('hidden', !hasVal);
    renderTable();
});
$('clear-search').addEventListener('click', () => {
    $('search-input').value = '';
    $('clear-search').classList.add('hidden');
    renderTable();
});
$('status-filter').addEventListener('change', loadDocs);
$('refresh-btn').addEventListener('click', loadDocs);

// ─── Upload ───────────────────────────────────────────────────────────────────
let selectedFile = null;

const dropZone  = $('drop-zone');
const fileInput = $('file-input');

dropZone.addEventListener('click', (e) => {
    if (!selectedFile && e.target.id !== 'remove-file-btn') fileInput.click();
});
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => { if (e.target.files[0]) pickFile(e.target.files[0]); });

function pickFile(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'txt', 'docx'].includes(ext)) {
        showAlert('upload-alert', 'Only PDF, TXT, and DOCX files are allowed.', 'error');
        return;
    }
    clearAlert('upload-alert');
    selectedFile = f;
    $('file-name').textContent = f.name;
    $('file-size').textContent = formatSize(f.size);
    $('drop-prompt').classList.add('hidden');
    $('file-preview').classList.remove('hidden');
    dropZone.classList.add('has-file');
    $('upload-btn').disabled = false;
}

$('remove-file-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
});

function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    $('drop-prompt').classList.remove('hidden');
    $('file-preview').classList.add('hidden');
    dropZone.classList.remove('has-file');
    $('upload-btn').disabled = true;
}

$('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const deviceType = $('device-type').value.trim();
    const brand      = $('brand').value.trim();
    const model      = $('model').value.trim();

    if (!deviceType || !brand) {
        showAlert('upload-alert', 'Device type and brand are required.', 'error');
        return;
    }
    clearAlert('upload-alert');

    // start progress animation
    let prog = 0;
    $('progress-wrap').classList.remove('hidden');
    $('progress-bar').style.width = '0%';
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
        prog = Math.min(prog + 3, 88);
        $('progress-bar').style.width = prog + '%';
    }, 200);

    setUploadBusy(true);

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('device_type', deviceType);
    fd.append('brand', brand);
    if (model) fd.append('model', model);

    try {
        const token = adminToken();
        const res = await fetch(`${API}/upload-manual`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
        });
        if (!res.ok) {
            let detail = `HTTP ${res.status}`;
            try { const j = await res.json(); detail = j.detail || detail; } catch {}
            throw new Error(detail);
        }

        clearInterval(progressTimer);
        $('progress-bar').style.width = '100%';
        setTimeout(() => { $('progress-wrap').classList.add('hidden'); $('progress-bar').style.width = '0%'; }, 600);

        showAlert('upload-alert', `"${selectedFile.name}" uploaded and queued for processing!`, 'success');
        clearFile();
        $('upload-form').querySelectorAll('input[type=text]').forEach(i => i.value = '');
        loadDocs();
    } catch (err) {
        clearInterval(progressTimer);
        $('progress-wrap').classList.add('hidden');
        showAlert('upload-alert', 'Upload failed: ' + err.message, 'error');
    } finally {
        setUploadBusy(false);
    }
});

function setUploadBusy(busy) {
    $('upload-btn').disabled = busy;
    $('upload-btn').querySelector('.btn-text').classList.toggle('hidden', busy);
    $('upload-btn').querySelector('.btn-loader').classList.toggle('hidden', !busy);
}

function showAlert(id, msg, type) {
    const el = $(id);
    el.textContent = msg;
    el.className = `alert ${type}`;
    el.classList.remove('hidden');
}
function clearAlert(id) { $(id).classList.add('hidden'); }

// ─── Delete ───────────────────────────────────────────────────────────────────
function openDeleteModal(id, name) {
    toDeleteId   = id;
    toDeleteName = name;
    $('delete-filename').textContent = name;
    $('delete-modal').classList.remove('hidden');
}

$('cancel-delete-btn').addEventListener('click', () => {
    $('delete-modal').classList.add('hidden');
});
$('delete-modal').addEventListener('click', (e) => {
    if (e.target === $('delete-modal')) $('delete-modal').classList.add('hidden');
});

$('confirm-delete-btn').addEventListener('click', async () => {
    $('confirm-delete-btn').disabled = true;
    $('confirm-delete-btn').textContent = 'Deleting…';
    try {
        await apiFetch(`/documents/${toDeleteId}`, { method: 'DELETE' });
        allDocs = allDocs.filter(d => d.document_id !== toDeleteId);
        renderTable();
        showToast(`"${toDeleteName}" deleted.`);
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    } finally {
        $('delete-modal').classList.add('hidden');
        $('confirm-delete-btn').disabled = false;
        $('confirm-delete-btn').textContent = 'Delete';
    }
});

// ─── Re-index ─────────────────────────────────────────────────────────────────
async function reindexDoc(id) {
    try {
        await apiFetch(`/documents/${id}/reindex`, { method: 'POST' });
        showToast('Re-indexing started!');
        loadDocs();
    } catch (err) {
        showToast('Re-index failed: ' + err.message, 'error');
    }
}

// ─── Init: check existing admin session ───────────────────────────────────────
(function init() {
    const token = adminToken();
    const email = localStorage.getItem(ADMIN_EMAIL_KEY);
    if (token && email) {
        // Verify token is still valid by hitting /me
        fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(u => {
                if (u.is_admin) {
                    enterDashboard(email);
                } else {
                    // token valid but no longer admin
                    localStorage.removeItem(ADMIN_TOKEN_KEY);
                    showScreen('login-screen');
                }
            })
            .catch(() => {
                localStorage.removeItem(ADMIN_TOKEN_KEY);
                showScreen('login-screen');
            });
    } else {
        showScreen('login-screen');
    }
})();

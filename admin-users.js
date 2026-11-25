(() => {
  const API_BASE = '/api/admin/users';

  function getAuthHeaders() {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('webrpg_token') ||
      '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function notifyUser(title, message) {
    const modal = document.getElementById('notify-modal');
    const titleEl = document.getElementById('notify-title');
    const msgEl = document.getElementById('notify-message');
    if (modal && titleEl && msgEl) {
      titleEl.textContent = title;
      msgEl.textContent = message;
      modal.classList.remove('hidden');
    } else {
      alert(`${title}: ${message}`);
    }
  }

  const tbody = document.getElementById('users-table-body');
  const searchInput = document.getElementById('user-search-input');
  const roleFilter = document.getElementById('filter-user-role');
  const ageFilter = document.getElementById('filter-user-age');
  const statusFilter = document.getElementById('filter-user-status');
  const refreshBtn = document.getElementById('btn-refresh-users');
  const userModal = document.getElementById('user-modal');
  const attemptsBody = document.getElementById('modal-user-attempts-body');

  async function loadAdminUsers() {
    const titleEl = document.getElementById('workspace-title');
    if (titleEl && document.getElementById('view-users')?.classList.contains('active')) {
      titleEl.textContent = 'USERS MANAGEMENT';
    }

    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:18px;">Loading users...</td></tr>`;

    const params = new URLSearchParams({
      q: searchInput?.value || '',
      role: roleFilter?.value || 'all',
      age_bracket: ageFilter?.value || 'all',
      status: statusFilter?.value || 'all'
    });

    try {
      const res = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Unable to load users.');
      renderUsersTable(data.users || []);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ff2a6d; padding:18px;">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderUsersTable(users) {
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:18px;">No matching users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users
      .map((u) => {
        const isAdmin = u.role === 'admin';
        const status = (u.status || 'active').toLowerCase();
        const statusColor = status === 'active' ? '#3ef2a8' : '#ff2a6d';
        const avgDisplay = u.avg_score !== null && u.avg_score !== undefined ? `${u.avg_score}%` : '—';
        const ageDisplay = u.age !== null && u.age !== undefined ? escapeHtml(u.age) : '—';

        return `
          <tr>
            <td>#${u.user_id}</td>
            <td>
              <strong>${escapeHtml(u.username)}</strong><br />
              <small style="opacity:0.75;">${escapeHtml(u.email || '—')}</small>
            </td>
            <td style="color:${isAdmin ? '#C84BF2' : '#4AD8F0'}; font-weight:700;">
              ${escapeHtml((u.role || 'learner').toUpperCase())}
            </td>
            <td>${ageDisplay}</td>
            <td>Lv. ${u.level ?? 1} <small style="opacity:0.75;">(${u.xp ?? 0} XP)</small></td>
            <td>${avgDisplay}</td>
            <td style="color:${statusColor}; font-weight:700;">
              ${escapeHtml(status.toUpperCase())}
            </td>
            <td>
              <button type="button" class="cp-notch-btn cyan-btn sm" onclick="openUserModal(${u.user_id})">
                MANAGE
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  async function openUserModal(userId) {
    try {
      const res = await fetch(`${API_BASE}/${userId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return notifyUser('ERROR', data.message || 'Failed to load user details.');
      }

      const { user, attempts = [] } = data;
      document.getElementById('modal-user-tag').textContent = `USER #${user.user_id}`;
      document.getElementById('modal-user-heading').textContent = (user.username || 'USER').toUpperCase();
      document.getElementById('edit-user-id').value = user.user_id;
      document.getElementById('edit-user-role').value = user.role || 'learner';
      document.getElementById('edit-user-status').value = user.status || 'active';
      document.getElementById('edit-user-age').value = user.age ?? '';

      attemptsBody.innerHTML = attempts.length
        ? attempts
            .map(
              (a) => `
              <tr>
                <td>${escapeHtml(a.assessment_title)}</td>
                <td>${escapeHtml(a.assessment_type)}</td>
                <td>${a.score}%</td>
                <td style="color:${a.result_status === 'PASSED' ? '#3ef2a8' : '#ff2a6d'}; font-weight:700;">
                  ${escapeHtml(a.result_status)}
                </td>
                <td>${a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}</td>
              </tr>
            `
            )
            .join('')
        : `<tr><td colspan="5" style="text-align:center; padding:12px;">No quiz attempts recorded yet.</td></tr>`;

      userModal.classList.remove('hidden');
    } catch {
      notifyUser('ERROR', 'Could not fetch user profile.');
    }
  }

  function closeUserModal() {
    userModal?.classList.add('hidden');
  }

  async function saveUserChanges() {
    const id = document.getElementById('edit-user-id').value;
    const payload = {
      role: document.getElementById('edit-user-role').value,
      status: document.getElementById('edit-user-status').value,
      age: document.getElementById('edit-user-age').value
    };

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) return notifyUser('ERROR', data.message || 'Update failed.');
      closeUserModal();
      notifyUser('UPDATED', data.message || 'User account updated.');
      loadAdminUsers();
    } catch {
      notifyUser('ERROR', 'Network error while saving user.');
    }
  }

  async function deleteUserAccount() {
    const id = document.getElementById('edit-user-id').value;
    if (!confirm('Permanently delete this user and all associated quiz attempts?')) return;

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) return notifyUser('ERROR', data.message || 'Delete failed.');
      closeUserModal();
      notifyUser('DELETED', data.message || 'User account deleted.');
      loadAdminUsers();
    } catch {
      notifyUser('ERROR', 'Network error while deleting user.');
    }
  }

  [roleFilter, ageFilter, statusFilter].forEach((el) => el?.addEventListener('change', loadAdminUsers));
  refreshBtn?.addEventListener('click', loadAdminUsers);

  let debounceTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadAdminUsers, 280);
  });

  window.loadAdminUsers = loadAdminUsers;
  window.openUserModal = openUserModal;
  window.closeUserModal = closeUserModal;
  window.saveUserChanges = saveUserChanges;
  window.deleteUserAccount = deleteUserAccount;
})();
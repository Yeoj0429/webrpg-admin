(() => {
  const API_BASE = '/api/admin/users';
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
  });

  const tbody = document.getElementById('users-table-body');
  const searchInput = document.getElementById('user-search');
  const roleFilter = document.getElementById('filter-role');
  const ageFilter = document.getElementById('filter-age');
  const statusFilter = document.getElementById('filter-status');

  const modal = document.getElementById('user-modal');
  const attemptsBody = document.getElementById('modal-attempts-body');

  async function loadUsers() {
    const params = new URLSearchParams({
      q: searchInput.value,
      role: roleFilter.value,
      age_bracket: ageFilter.value,
      status: statusFilter.value
    });

    try {
      const res = await fetch(`${API_BASE}?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      renderUsersTable(data.users);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="color:#ff4d6d;text-align:center;">Error loading users: ${err.message}</td></tr>`;
    }
  }

  function renderUsersTable(users) {
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No matching users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>#${u.user_id}</td>
        <td>
          <strong>${u.username}</strong><br/>
          <small style="opacity:0.75;">${u.email || '—'}</small>
        </td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-magenta' : 'badge-cyan'}">${u.role.toUpperCase()}</span></td>
        <td>${u.age_bracket}</td>
        <td>Lv. ${u.level} <small>(${u.xp} XP)</small></td>
        <td>${u.avg_score !== null ? `${u.avg_score}%` : 'No attempts'}</td>
        <td><span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}">${u.status.toUpperCase()}</span></td>
        <td>
          <button class="cp-notch-btn btn-sm" onclick="window.openUserModal(${u.user_id})">Manage</button>
        </td>
      </tr>
    `).join('');
  }

  window.openUserModal = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/${userId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) return alert(data.message);

      const { user, attempts } = data;
      document.getElementById('modal-username').textContent = `${user.username} (#${user.user_id})`;
      document.getElementById('edit-user-id').value = user.user_id;
      document.getElementById('edit-user-role').value = user.role;
      document.getElementById('edit-user-status').value = user.status;
      if (user.age_bracket !== 'N/A') {
        document.getElementById('edit-user-age').value = user.age_bracket;
      }

      attemptsBody.innerHTML = attempts.length
        ? attempts.map(a => `
            <tr>
              <td>${a.assessment_title}</td>
              <td>${a.assessment_type}</td>
              <td>${a.score}%</td>
              <td style="color:${a.result_status === 'PASSED' ? '#3ef2a8' : '#ff4d6d'}">${a.result_status}</td>
              <td>${new Date(a.completed_at).toLocaleDateString()}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="5" style="text-align:center;">No quiz attempts recorded yet.</td></tr>`;

      modal.style.display = 'flex';
    } catch (err) {
      alert('Failed to load user details.');
    }
  };

  // Save edits
  document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const payload = {
      role: document.getElementById('edit-user-role').value,
      status: document.getElementById('edit-user-status').value,
      age_bracket: document.getElementById('edit-user-age').value
    };

    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message);
    if (data.success) {
      modal.style.display = 'none';
      loadUsers();
    }
  });

  // Delete user
  document.getElementById('btn-delete-user').addEventListener('click', async () => {
    const id = document.getElementById('edit-user-id').value;
    if (!confirm('Permanently delete this account and all its quiz attempts?')) return;

    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    alert(data.message);
    if (data.success) {
      modal.style.display = 'none';
      loadUsers();
    }
  });

  // Event bindings
  document.getElementById('close-user-modal').addEventListener('click', () => (modal.style.display = 'none'));
  document.getElementById('btn-refresh-users').addEventListener('click', loadUsers);
  [roleFilter, ageFilter, statusFilter].forEach(el => el.addEventListener('change', loadUsers));

  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadUsers, 300);
  });

  // Load when tab is opened
  document.querySelector('[data-view="users-view"]')?.addEventListener('click', loadUsers);
})();
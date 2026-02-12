const output = document.getElementById('output');
const tokenState = document.getElementById('tokenState');
const avatarBtn = document.getElementById('avatarBtn');
const profileMenuHost = document.getElementById('profileMenuHost');
let accessToken = sessionStorage.getItem('sf_access_token') || '';

let profileMenu = null;
let avatarAuthBtn = null;
let avatarAuthLabel = null;

function writeOutput(payload) {
  if (!output) return;
  output.textContent = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload, null, 2);
}

function setToken(token) {
  accessToken = token || '';
  if (accessToken) {
    sessionStorage.setItem('sf_access_token', accessToken);
    tokenState.textContent = 'Access token: set';
    if (avatarAuthLabel) avatarAuthLabel.textContent = 'Log out';
  } else {
    sessionStorage.removeItem('sf_access_token');
    tokenState.textContent = 'Access token: empty';
    if (avatarAuthLabel) avatarAuthLabel.textContent = 'Login / Register';
  }
}

function openProfileMenu() {
  if (!profileMenu) return;
  profileMenu.classList.add('open');
  profileMenu.setAttribute('aria-hidden', 'false');
  avatarBtn.setAttribute('aria-expanded', 'true');
}

function closeProfileMenu() {
  if (!profileMenu) return;
  profileMenu.classList.remove('open');
  profileMenu.setAttribute('aria-hidden', 'true');
  avatarBtn.setAttribute('aria-expanded', 'false');
}

function toggleProfileMenu() {
  if (!profileMenu) return;
  if (profileMenu.classList.contains('open')) closeProfileMenu();
  else openProfileMenu();
}

async function api(path, method = 'GET', body = null, withAuth = false) {
  const result = withAuth
    ? await window.sf.fetchWithAuthen(path, accessToken, method, body)
    : await window.sf.shortFetch(path, method, body);

  writeOutput({ status: result.res.status, ...result.data });
  return result;
}

async function loadProfileMenu() {
  const res = await fetch('/html/profile-menu.html', { cache: 'no-store' });
  const html = await res.text();
  profileMenuHost.innerHTML = html;

  profileMenu = document.getElementById('profileMenu');
  avatarAuthBtn = document.getElementById('avatarAuthBtn');
  avatarAuthLabel = document.getElementById('avatarAuthLabel');

  setToken(accessToken);

  if (avatarAuthBtn) {
    avatarAuthBtn.addEventListener('click', async () => {
      if (!accessToken) {
        closeProfileMenu();
        document.getElementById('loginEmail').focus();
        return;
      }

      await api('/logout', 'POST', null, true);
      setToken('');
      closeProfileMenu();
    });
  }
}

function bindEvents() {
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('/register', 'POST', {
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value,
      displayName: document.getElementById('regDisplayName').value
    });
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data } = await api('/login', 'POST', {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value
    });
    setToken(data?.data?.accessToken || '');
  });

  document.getElementById('meBtn').addEventListener('click', async () => {
    await api('/me', 'GET', null, true);
  });

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const { data } = await api('/rf', 'POST');
    if (data?.data?.accessToken) setToken(data.data.accessToken);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/logout', 'POST', null, true);
    setToken('');
    closeProfileMenu();
  });

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleProfileMenu();
  });

  document.addEventListener('click', (e) => {
    const clickedInsideMenu = profileMenu && profileMenu.contains(e.target);
    const clickedAvatar = avatarBtn.contains(e.target);
    if (!clickedInsideMenu && !clickedAvatar) {
      closeProfileMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfileMenu();
  });
}

async function init() {
  writeOutput({ status: 'ready', message: 'Session console initialized', base: window.sf.AUTH_BASE });
  setToken(accessToken);
  bindEvents();
  try {
    await loadProfileMenu();
  } catch (err) {
    writeOutput({ status: 'warn', message: `Profile menu load failed: ${err.message}` });
  }
}

init().catch((err) => {
  writeOutput({ status: 'error', message: `Init error: ${err.message}` });
});

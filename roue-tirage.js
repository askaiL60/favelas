// --- Config ---
const API_URL = 'https://favelas-production.up.railway.app/api/participants';
// Optionnel: filtrer par commune (ex: 'Bandrele'), sinon mets null
const FILTER_VILLAGE = null;

// --- État ---
let pool = [];                       // participants restants pour la roue
let winners = new Set();             // pseudos déjà gagnants (session)
const LS_POOL = 'wheel_pool';
const LS_WINNERS = 'wheel_winners';

// --- Utils ---
const shuffle = arr => arr.sort(() => 0.5 - Math.random());
const saveState = () => {
  localStorage.setItem(LS_POOL, JSON.stringify(pool));
  localStorage.setItem(LS_WINNERS, JSON.stringify([...winners]));
};
const loadState = () => {
  const p = JSON.parse(localStorage.getItem(LS_POOL) || '[]');
  const w = JSON.parse(localStorage.getItem(LS_WINNERS) || '[]');
  pool = Array.isArray(p) ? p : [];
  winners = new Set(Array.isArray(w) ? w : []);
};

function renderCount() {
  const el = document.querySelector('#count');
  if (el) el.textContent = pool.length;
}

function appendWinnerToUI({ pseudo, prenom }) {
  const box = document.querySelector('#winner');
  if (!box) return;
  const item = document.createElement('div');
  item.className = 'win-line';
  item.textContent = `${pseudo} (${prenom})`;
  box.prepend(item);
}

// --- Chargement participants ---
async function fetchParticipants() {
  const res = await fetch(API_URL, { headers: { 'Accept': 'application/json' } });
  const rows = await res.json();

  // Filtre + dédoublonnage par pseudo (insensible à la casse/espaces)
  const seen = new Set();
  const list = [];
  for (const r of rows) {
    if (FILTER_VILLAGE && r.village !== FILTER_VILLAGE) continue;
    const key = (r.pseudo || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push({ pseudo: r.pseudo.trim(), prenom: (r.prenom || '').trim(), village: r.village || '' });
  }
  return list;
}

// --- Initialisation ---
async function initWheel() {
  // tenter de recharger l'état local
  loadState();

  if (pool.length === 0) {
    try {
      const list = await fetchParticipants();
      // retirer ceux déjà gagnés (si on relance après tirages)
      pool = list.filter(p => !winners.has(p.pseudo.toLowerCase()));
      shuffle(pool);
      saveState();
    } catch (e) {
      console.error('Erreur API, utilisation du cache local si dispo :', e);
      // si pas d’API et pas de cache -> on reste avec pool=[]
    }
  }

  renderCount();

  if (pool.length < 2) {
    console.warn('Pas assez de participants pour tirer.');
  }
}

// --- Tirage ---
function drawOne() {
  if (pool.length === 0) {
    console.warn('Plus de participants disponibles.');
    return null;
  }
  // tirage simple: prendre un index aléatoire, retirer du pool
  const idx = Math.floor(Math.random() * pool.length);
  const winner = pool.splice(idx, 1)[0];
  winners.add(winner.pseudo.toLowerCase());
  saveState();
  renderCount();
  return winner;
}

// --- Hook bouton "Lancer" ---
function setupUI() {
  const btn = document.querySelector('#spinBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      // ici tu peux déclencher ton animation de roue puis, au "stop", appeler drawOne()
      const w = drawOne();
      if (w) appendWinnerToUI(w);
    });
  }

  // Optionnel: bouton reset session (à utiliser avec prudence)
  const reset = document.querySelector('#resetBtn');
  if (reset) {
    reset.addEventListener('click', async () => {
      localStorage.removeItem(LS_POOL);
      localStorage.removeItem(LS_WINNERS);
      winners.clear();
      pool = [];
      await initWheel();
      const box = document.querySelector('#winner');
      if (box) box.innerHTML = '';
    });
  }
}

// --- Go ---
initWheel().then(setupUI);

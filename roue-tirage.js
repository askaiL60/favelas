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

// --- Particules douces en arrière-plan ---
(() => {
  const c = document.getElementById('bg-particles');
  if (!c) return; // sécurité si le canvas n'est pas présent
  const ctx = c.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W, H, particles;

  function resize() {
    W = c.width  = innerWidth  * DPR;
    H = c.height = innerHeight * DPR;
    c.style.width  = innerWidth + 'px';
    c.style.height = innerHeight + 'px';
    const count = Math.max(80, Math.min(220, Math.floor((innerWidth*innerHeight)*0.00015)));
particles = Array.from({length: count}, () => ({
  x: Math.random()*W,
  y: Math.random()*H,
  r: (Math.random()*1.8 + 0.8) * DPR, // étoiles un peu plus grandes
  a: Math.random()*Math.PI*2,
  s: Math.random()*0.25 + 0.1        // mouvement très lent
}));

  }
  addEventListener('resize', resize); resize();

  function tick() {
  ctx.clearRect(0,0,W,H);
  for (const p of particles) {
    // léger déplacement
    p.a += (Math.random()-0.5)*0.02;
    p.x += Math.cos(p.a)*p.s;
    p.y += Math.sin(p.a)*p.s;

    // rebouclage si sortie
    if (p.x<0) p.x+=W; if (p.x>W) p.x-=W;
    if (p.y<0) p.y+=H; if (p.y>H) p.y-=H;

    // --- Scintillement ---
    const twinkle = 0.6 + 0.4 * Math.sin(Date.now()/300 + p.x*0.01 + p.y*0.01);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7*twinkle})`;
    ctx.fill();
  }
  requestAnimationFrame(tick);
}

  tick();
})();


// --- Liste complète des villages/localités de Mayotte ---
const VILLAGES = [
  // Acoua
  "Acoua", "Mtsangadoua",

  // Bandraboua
  "Bandraboua", "Handrema", "Mtsangamboua",

  // Bandrélé
  "Bandrélé", "Hamouro", "Dapani", "Mtsamoudou",

  // Bouéni
  "Bouéni", "Bambo-Ouest", "Mbouanatsa", "Majiméouni", "Mzouazia", "Hagnoundrou",

  // Chiconi
  "Chiconi", "Miréréni",

  // Chirongui
  "Chirongui", "Mramadoudou", "Poroani", "Tsimkoura", "Bambo-Est",

  // Dembéni
  "Dembéni", "Iloni", "Tsararano",

  // Dzaoudzi-Labattoir (Petite-Terre)
  "Dzaoudzi", "Labattoir",

  // Kani-Kéli
  "Kani-Kéli", "Passy-Kéli",

  // Koungou
  "Koungou", "Majicavo Lamir", "Majicavo Koropa", "Longoni", "Trévani",

  // Mamoudzou
  "Mamoudzou", "Cavani", "Vahibé", "Passamainty", "M’Tsapéré", "Kawéni", "Tsoundzou 1", "Tsoundzou 2",

  // Mtsamboro
  "Mtsamboro", "Hamjago", "Mtsahara",

  // M’Tsangamouji
  "M’Tsangamouji", "Mliha",

  // Ouangani
  "Ouangani", "Coconi", "Kahani",

  // Pamandzi (Petite-Terre)
  "Pamandzi",

  // Sada
  "Sada", "Mangajou",

  // Tsingoni
  "Tsingoni", "Combani", "Mroalé"
];

window.addEventListener("DOMContentLoaded", () => {
  const villageSelect = document.getElementById("village");
  if (!villageSelect) return;

  // Tri alphabétique “à la française” (accents, apostrophes, etc.)
  const uniques = Array.from(new Set(VILLAGES)); // au cas où, supprime les doublons
  uniques.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base', ignorePunctuation: true }));

  // Option placeholder
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "— Choisir un village —";
  placeholder.disabled = true;
  placeholder.selected = true;
  villageSelect.appendChild(placeholder);

  // Injection des options
  uniques.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    villageSelect.appendChild(opt);
  });

  fetchParticipants();
});

// Envoi du formulaire
document.getElementById('formulaire').addEventListener('submit', async (e) => {
  e.preventDefault();

  const prenom  = document.getElementById('prenom').value.trim();
  const pseudo  = document.getElementById('pseudo').value.trim();
  const village = document.getElementById('village').value;
  const taille  = document.getElementById('taille').value;

  const res = await fetch('/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prenom, pseudo, village, taille })
  });

  const data = await res.json();
  const confirmation = document.getElementById('confirmation');
  confirmation.innerText = data.message;

  if (res.status === 409) {
    confirmation.style.color = "red";    // déjà participé / bloqué
  } else {
    confirmation.style.color = "green";  // succès
  }

  if (res.ok) {
    await fetchParticipants();
    document.getElementById('formulaire').reset();
    document.getElementById('village').value = ""; // remettre le placeholder
  }
});

// Récupérer et afficher les participants + MAJ compteur
async function fetchParticipants() {
  try {
    const res = await fetch('/api/participants');
    const data = await res.json();

    const container = document.getElementById('participants-list');
    container.innerHTML = '';

    data.forEach(p => {
      const div = document.createElement('div');
      div.className = "participant";
      div.innerHTML = `${p.prenom} (@${p.pseudo}), ${p.village}`;
      container.appendChild(div);
    });

    const badge = document.getElementById('count-badge');
    if (badge) {
      badge.textContent = data.length;
      badge.title = `${data.length} inscrit${data.length > 1 ? 's' : ''}`;
    }
  } catch (e) {
    console.error(e);
  }
}

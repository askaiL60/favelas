// —— Fallback local si l'API des villages ne répond pas
const VILLAGES_FALLBACK = [
  "Acoua","Mtsangadoua","Bandraboua","Handrema","Mtsangamboua","Bandrélé","Hamouro","Dapani","Mtsamoudou",
  "Bouéni","Bambo-Ouest","Mbouanatsa","Majiméouni","Mzouazia","Hagnoundrou","Chiconi","Miréréni","Chirongui",
  "Mramadoudou","Poroani","Tsimkoura","Bambo-Est","Dembéni","Iloni","Tsararano","Dzaoudzi","Labattoir",
  "Kani-Kéli","Passy-Kéli","Koungou","Majicavo Lamir","Majicavo Koropa","Longoni","Trévani","Mamoudzou",
  "Cavani","Vahibé","Passamainty","M’Tsapéré","Kawéni","Mtsamboro","Hamjago","Mtsahara","M’Tsangamouji",
  "Mliha","Ouangani","Coconi","Kahani","Pamandzi","Sada","Mangajou","Tsingoni","Combani","Mroalé",
  "Vahibé","Tsoundzou 1","Tsoundzou 2","Passamainty","Vahibé"
];

window.addEventListener("DOMContentLoaded", async () => {
  await populateVillages();
  await fetchParticipants();

  // Soumission du formulaire
  document.getElementById('formulaire').addEventListener('submit', onSubmit);

  // Bouton "Voir nos produits"
  const btn = document.getElementById('btnProducts');
  if (btn) btn.addEventListener('click', () => {
    window.location.href = 'bonnet.html';
  });
});

// Remplit la liste des villages (API -> fallback)
async function populateVillages() {
  const select = document.getElementById("village");
  if (!select) return;

  try {
    const res = await fetch('/api/villages');
    if (!res.ok) throw new Error('villages api error');
    const villages = await res.json();
    injectOptions(select, villages);
  } catch {
    const uniques = Array.from(new Set(VILLAGES_FALLBACK));
    uniques.sort((a,b)=> a.localeCompare(b,'fr',{sensitivity:'base',ignorePunctuation:true}));
    injectOptions(select, uniques);
  }
}

function injectOptions(select, list) {
  // vide (garde la 1re option placeholder)
  select.innerHTML = '<option value="">Sélectionnez votre village</option>';
  list.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

// Soumission + redirection vers bonnet.html
async function onSubmit(e) {
  e.preventDefault();

  const prenom  = document.getElementById('prenom').value.trim();
  const pseudo  = document.getElementById('pseudo').value.trim();
  const village = document.getElementById('village').value;
  const taille  = document.getElementById('taille').value;

  const confirmation = document.getElementById('confirmation');

  if (!prenom || !pseudo || !village || !taille) {
    confirmation.textContent = "Merci de remplir tous les champs.";
    confirmation.style.color = "red";
    return;
  }

  try {
    const res = await fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom, pseudo, village, taille })
    });

    let data = {};
    try { data = await res.json(); } catch {}

    confirmation.textContent = data.message || (res.ok ? "Participation enregistrée !" : "Erreur serveur");
    confirmation.style.color = res.ok ? "green" : "red";

    if (res.ok) {
      // flag pour toast éventuel côté bonnet.html
      sessionStorage.setItem('contest:ok', '1');
      window.location.href = 'bonnet.html';
      return;
    }

    await fetchParticipants(); // reste sur page et rafraîchit en cas d’erreur
  } catch (err) {
    console.error(err);
    confirmation.textContent = "Impossible de soumettre pour le moment.";
    confirmation.style.color = "red";
  }
}

// Récupérer et afficher les participants + MAJ compteur
async function fetchParticipants() {
  try {
    const res = await fetch('/api/participants');
    if (!res.ok) throw new Error('participants api error');
    const data = await res.json();

    const container = document.getElementById('participants-list');
    container.innerHTML = '';

    data.forEach(p => {
      const div = document.createElement('div');
      div.className = "participant";
      const safePseudo = (p.pseudo || '').replace(/^@/,'');
      div.textContent = `${p.prenom} (@${safePseudo}), ${p.village}`;
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

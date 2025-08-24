const villagePT = [   "Passamainty",
  "Tsoundzou 1",
  "Tsoundzou 2",
  "Vahibé",
  "M’Tsapéré",
  "Cavani",
  "Mamoudzou",
  "Kaweni"
];

window.addEventListener("DOMContentLoaded", () => {
  const villageSelect = document.getElementById("village");

  villagePT.sort().forEach(v => {
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
    confirmation.style.color = "red";    // déjà participé
  } else {
    confirmation.style.color = "green";  // succès
  }

  if (res.ok) {
    await fetchParticipants();                  // recharger la liste
    document.getElementById('formulaire').reset();
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

    // ➜ Met à jour le badge compteur à côté du titre
    const badge = document.getElementById('count-badge');
    if (badge) {
      badge.textContent = data.length;
      badge.title = `${data.length} inscrit${data.length > 1 ? 's' : ''}`;
    }
  } catch (e) {
    console.error(e);
  }
}

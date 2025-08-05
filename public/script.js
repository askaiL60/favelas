const villageBandrele = [
  "Bambo Est", "Bandrele", "Dapani", "Hamouro", "Mgnambani", "Mtsamoudou", "Nyambadao"
];

window.addEventListener("DOMContentLoaded", () => {
  const villageSelect = document.getElementById("village");

  villageBandrele.sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;              // ← ESSENTIEL !
    opt.textContent = v;
    villageSelect.appendChild(opt);
  });

  fetchParticipants();
});


// Envoi du formulaire
document.getElementById('formulaire').addEventListener('submit', async (e) => {
  e.preventDefault();

  const prenom = document.getElementById('prenom').value;
  const pseudo = document.getElementById('pseudo').value;
  const village = document.getElementById('village').value;
  const taille = document.getElementById('taille').value;

  const res = await fetch('/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prenom, pseudo, village, taille })
  });

  const data = await res.json();
  const confirmation = document.getElementById('confirmation');
  confirmation.innerText = data.message;

if (res.status === 409) {
  confirmation.style.color = "red";  // texte en rouge
} else {
  confirmation.style.color = "green"; // pour succès par ex.
}


  if (res.ok) {
    fetchParticipants(); // recharger la liste
    document.getElementById('formulaire').reset(); // réinitialiser le formulaire
  }
});

// Récupérer et afficher les participants
async function fetchParticipants() {
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
}

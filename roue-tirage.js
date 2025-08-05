// URL de ton API Railway
const API_URL = 'https://favelas-production.up.railway.app/api/participants';

// Récupération des participants via API
fetch(API_URL)
  .then(res => res.json())
  .then(results => {
    if (results.length < 2) {
      console.log("Pas assez de participants pour un tirage.");
      return;
    }

    // Tirage aléatoire de 2 gagnants différents
    const shuffled = results.sort(() => 0.5 - Math.random());
    const gagnants = shuffled.slice(0, 2);

    console.log("\n🎯 🎉 GAGNANTS DU TIRAGE 🎉");
    gagnants.forEach((g, i) => {
      console.log(`Gagnant ${i + 1} : ${g.pseudo} (${g.prenom})`);
    });
  })
  .catch(err => console.error("Erreur lors de la récupération des participants :", err));

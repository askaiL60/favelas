const mysql = require('mysql2');

// Connexion MySQL (modifie si tu utilises un .env)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // ton mot de passe MySQL si nécessaire
  database: 'formulairedb'
});

db.connect((err) => {
  if (err) {
    console.error("Erreur de connexion à MySQL :", err);
    return;
  }
  console.log("✅ Connecté à MySQL");

  // Requête : récupérer tous les participants
  db.query('SELECT prenom, pseudo FROM participants', (err, results) => {
    if (err) {
      console.error("Erreur lors de la récupération :", err);
      db.end();
      return;
    }

    if (results.length < 2) {
      console.log("Pas assez de participants pour un tirage.");
      db.end();
      return;
    }

    // Tirage aléatoire de 2 gagnants différents
    const shuffled = results.sort(() => 0.5 - Math.random());
    const gagnants = shuffled.slice(0, 2);

    console.log("\n🎯 🎉 GAGNANTS DU TIRAGE 🎉");
    gagnants.forEach((g, i) => {
      console.log(`Gagnant ${i + 1} : ${g.pseudo} (${g.prenom})`);
    });

    db.end(); // Ferme la connexion proprement
  });
});

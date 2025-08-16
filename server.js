const express = require('express'); 
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Connexion MySQL (Railway)
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

// Vérifier la connexion MySQL
db.connect(err => {
  if (err) {
    console.error("❌ Erreur de connexion MySQL :", err);
  } else {
    console.log("✅ Connecté à la base MySQL Railway");
  }
});

// POST /submit : inscription avec exclusions
app.post('/submit', (req, res) => {
  let { prenom, pseudo, village, taille } = req.body;

  // Petite sanitation
  prenom = (prenom || '').trim();
  pseudo = (pseudo || '').trim();
  village = (village || '').trim();
  taille = (taille || '').trim();

  if (!prenom || !pseudo || !village || !taille) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  // 1) Déjà inscrit dans l'édition précédente ? (table 'participants')
  db.query('SELECT id FROM participants WHERE pseudo = ? LIMIT 1', [pseudo], (err, results) => {
    if (err) {
      console.error("❌ DB (check ancienne table):", err.sqlMessage || err);
      return res.status(500).json({ message: "Erreur DB (check ancienne table)" });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: "Tu as déjà participé à une édition précédente !" });
    }

    // 2) Déjà inscrit dans l'édition en cours ? (table 'participants_PT')
    db.query('SELECT id FROM participants_PT WHERE pseudo = ? LIMIT 1', [pseudo], (err2, results2) => {
      if (err2) {
        console.error("❌ DB (check table actuelle):", err2.sqlMessage || err2);
        return res.status(500).json({ message: "Erreur DB (check table actuelle)" });
      }

      if (results2.length > 0) {
        return res.status(409).json({ message: "Tu as déjà participé cette semaine !" });
      }

      // 3) Insert dans la table actuelle (laisser MySQL gérer date_participation par défaut)
      const sql = "INSERT INTO participants_PT (prenom, pseudo, village, taille) VALUES (?, ?, ?, ?)";
      db.query(sql, [prenom, pseudo, village, taille], (err3) => {
        if (err3) {
          console.error("❌ INSERT participants_PT:", err3.sqlMessage || err3);
          return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
        }
        res.status(200).json({ message: "Participation enregistrée !" });
      });
    });
  });
});

// GET /api/participants : liste de l'édition en cours
app.get('/api/participants', (req, res) => {
  const sql = `
    SELECT prenom, pseudo, village, taille, date_participation
    FROM participants_PT
    ORDER BY date_participation DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Erreur lors de la récupération des participants :", err.sqlMessage || err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
});

// Démarrage serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});

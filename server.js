const express = require('express'); 
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Connexion MySQL avec variables Railway
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT // Port MySQL fourni par Railway (ex: 35188)
});

// Vérifier la connexion MySQL
db.connect(err => {
  if (err) {
    console.error("❌ Erreur de connexion MySQL :", err);
  } else {
    console.log("✅ Connecté à la base MySQL Railway");
  }
});

// -------------------------
// POST /submit : inscription
// -------------------------
app.post('/submit', (req, res) => {
  const { prenom, pseudo, village, taille } = req.body;

  if (!prenom || !pseudo || !village || !taille) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  // 1) Vérifie si déjà inscrit dans l'ancienne édition (table participants)
  db.query('SELECT id FROM participants WHERE pseudo = ? LIMIT 1', [pseudo], (err, r1) => {
    if (err) {
      console.error("❌ Erreur DB (check ancienne table):", err);
      return res.status(500).json({ message: "Erreur DB (check ancienne table)" });
    }

    if (r1.length > 0) {
      return res.status(409).json({ message: "Tu as déjà participé à une édition précédente !" });
    }

    // 2) Vérifie si déjà inscrit dans l'édition en cours (table participants_PT)
    db.query('SELECT id FROM participants_PT WHERE pseudo = ? LIMIT 1', [pseudo], (err2, r2) => {
      if (err2) {
        console.error("❌ Erreur DB (check table actuelle):", err2);
        return res.status(500).json({ message: "Erreur DB (check table actuelle)" });
      }

      if (r2.length > 0) {
        return res.status(409).json({ message: "Tu as déjà participé cette semaine !" });
      }

      // 3) Sinon on insère dans participants_PT
      const sql = "INSERT INTO participants_PT (prenom, pseudo, village, taille) VALUES (?, ?, ?, ?)";
      db.query(sql, [prenom, pseudo, village, taille], (err3) => {
        if (err3) {
          console.error("❌ Erreur INSERT participants_PT:", err3);
          return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
        }
        res.status(200).json({ message: "Participation enregistrée !" });
      });
    });
  });
});

// -------------------------
// GET /api/participants : liste des inscrits de la semaine
// -------------------------
app.get('/api/participants', (req, res) => {
  db.query('SELECT * FROM participants_PT ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error("❌ Erreur lors de la récupération des participants :", err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
});

// -------------------------
// Démarrage du serveur Web
// -------------------------
const PORT = process.env.PORT || 3000; // Port Railway
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});

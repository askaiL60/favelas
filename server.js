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

// Route POST : inscription avec vérif pseudo unique
app.post('/submit', (req, res) => {
  const { prenom, pseudo, village, taille } = req.body;

  if (!prenom || !pseudo || !village || !taille) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  // 1) Vérifie si le pseudo existe déjà dans participants (édition précédente)
  db.query('SELECT id FROM participants WHERE pseudo = ? LIMIT 1', [pseudo], (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur DB (check ancienne table)" });

    if (results.length > 0) {
      // Déjà participé avant
      return res.status(409).json({ message: "Tu as déjà participé à une édition précédente !" });
    }

    // 2) Vérifie si le pseudo existe déjà dans participants_PT (édition en cours)
    db.query('SELECT id FROM participants_PT WHERE pseudo = ? LIMIT 1', [pseudo], (err2, results2) => {
      if (err2) return res.status(500).json({ message: "Erreur DB (check table actuelle)" });

      if (results2.length > 0) {
        return res.status(409).json({ message: "Tu as déjà participé cette semaine !" });
      }

      // 3) Insertion dans la table actuelle participants_PT
      const sql = "INSERT INTO participants_PT (prenom, pseudo, village, taille) VALUES (?, ?, ?, ?, NOW())";
      db.query(sql, [prenom, pseudo, village, taille], (err3) => {
        if (err3) return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
        res.status(200).json({ message: "Participation enregistrée !" });
      });
    });
  });
});

// Nouvelle Route GET : tous les participants de la semaine en cours
app.get('/api/participants', (req, res) => {
  db.query('SELECT * FROM participants_PT ORDER BY date_participation DESC', (err, results) => {
    if (err) {
      console.error("❌ Erreur lors de la récupération des participants :", err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
});

// Démarrage du serveur Web
const PORT = process.env.PORT || 3000; // Port du serveur web (Railway le définit)
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});

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

  // Vérifie si le pseudo existe déjà
  db.query('SELECT * FROM participants WHERE pseudo = ?', [pseudo], (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur DB" });
    if (results.length > 0) {
      return res.status(409).json({ message: "Tu as déjà participé !" });
    }

    // Insertion avec date automatique
    const sql = "INSERT INTO participants (prenom, pseudo, village, taille, date_participation) VALUES (?, ?, ?, ?, NOW())";
    db.query(sql, [prenom, pseudo, village, taille], (err2) => {
      if (err2) return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
      res.status(200).json({ message: "Participation enregistrée !" });
    });
  });
});

// Nouvelle Route GET : tous les participants (avec date_participation)
app.get('/api/participants', (req, res) => {
  db.query('SELECT * FROM participants', (err, results) => {
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

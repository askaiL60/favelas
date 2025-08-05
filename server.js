const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
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

    // Insertion
    const sql = "INSERT INTO participants (prenom, pseudo, village, taille) VALUES (?, ?, ?, ?)";
    db.query(sql, [prenom, pseudo, village, taille], (err2) => {
      if (err2) return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
      res.status(200).json({ message: "Participation enregistrée !" });
    });
  });
});

// Route GET : participants
app.get('/api/participants', (req, res) => {
  db.query('SELECT prenom, pseudo, village FROM participants', (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log("✅ Serveur lancé sur http://localhost:3000");
});

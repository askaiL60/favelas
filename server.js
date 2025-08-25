// server.js
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// -------------------------
// Connexion MySQL (Railway)
// -------------------------
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

db.connect(err => {
  if (err) {
    console.error("❌ Erreur de connexion MySQL :", err);
  } else {
    console.log("✅ Connecté à la base MySQL Railway");
  }
});

// ----------------------------------------------------
// POST /submit : inscription (anti-doublon multi-tables)
// ----------------------------------------------------
app.post('/submit', (req, res) => {
  let { prenom, pseudo, village, taille } = req.body;

  // Nettoyage + normalisation pour le check (insensible à la casse et aux espaces)
  prenom  = (prenom  || '').trim();
  pseudo  = (pseudo  || '').trim();
  village = (village || '').trim();
  taille  = (taille  || '').trim();
  const pseudoNorm = pseudo.toLowerCase();

  if (!prenom || !pseudo || !village || !taille) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  // Vérifier si déjà inscrit dans l'une des tables : participants (général),
  // participants_petit_terre (semaine précédente) ou participants_PT (semaine actuelle)
  const CHECK_DUP = `
    SELECT 'participants' AS src FROM participants WHERE LOWER(pseudo) = ?
    UNION
    SELECT 'participants_petit_terre' FROM participants_petit_terre WHERE LOWER(pseudo) = ?
    UNION
    SELECT 'participants_PT' FROM participants_PT WHERE LOWER(pseudo) = ?
    LIMIT 1
  `;

  db.query(CHECK_DUP, [pseudoNorm, pseudoNorm, pseudoNorm], (err, rows) => {
    if (err) {
      console.error("❌ DB (check doublon):", err.sqlMessage || err);
      return res.status(500).json({ message: "Erreur DB (check doublon)" });
    }

    if (rows.length > 0) {
      // On bloque toute ré-inscription sur le concours (peu importe la semaine)
      return res.status(409).json({ message: "Tu as déjà participé au concours !" });
    }

    // OK -> Insérer dans la table de la semaine en cours
    const INSERT_SQL = `
      INSERT INTO participants_PT (prenom, pseudo, village, taille, date_participation)
      VALUES (?, ?, ?, ?, CURDATE())
    `;
    db.query(INSERT_SQL, [prenom, pseudo, village, taille], (err2) => {
      if (err2) {
        console.error("❌ INSERT participants_PT:", err2.sqlMessage || err2);
        return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
      }
      return res.status(200).json({ message: "Participation enregistrée !" });
    });
  });
});

// -----------------------------------------------------
// GET /api/participants : liste des inscrits semaine en cours
// -----------------------------------------------------
app.get('/api/participants', (req, res) => {
  db.query('SELECT * FROM participants_PT ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error("❌ Erreur lors de la récupération des participants :", err.sqlMessage || err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
});

// -----------------------------------------------------
// /diag : vérifs rapides (ne modifie rien)
// -----------------------------------------------------
app.get('/diag', (req, res) => {
  const out = {};
  db.query('SELECT 1 AS ok', (e1) => {
    out.db = e1 ? 'ko' : 'ok';

    db.query('SELECT COUNT(*) AS c FROM participants', (e2, r2) => {
      out.participants = e2 ? 'ko' : `ok (${r2?.[0]?.c ?? 0})`;

      db.query('SELECT COUNT(*) AS c FROM participants_petit_terre', (e3, r3) => {
        out.participants_petit_terre = e3 ? 'ko' : `ok (${r3?.[0]?.c ?? 0})`;

        db.query('SELECT COUNT(*) AS c FROM participants_PT', (e4, r4) => {
          out.participants_PT = e4 ? 'ko' : `ok (${r4?.[0]?.c ?? 0})`;
          res.json(out);
        });
      });
    });
  });
});

// -------------------------
// Démarrage serveur
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});

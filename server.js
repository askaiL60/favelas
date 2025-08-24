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

db.connect(err => {
  if (err) {
    console.error(" Erreur de connexion MySQL :", err);
  } else {
    console.log(" Connecté à la base MySQL Railway");
  }
});

// -------------------------
// POST /submit : inscription
// -------------------------
app.post('/submit', (req, res) => {
  let { prenom, pseudo, village, taille } = req.body;

  // nettoyage
  prenom = (prenom || '').trim();
  pseudo = (pseudo || '').trim();
  village = (village || '').trim();
  taille = (taille || '').trim();

  if (!prenom || !pseudo || !village || !taille) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  // 1) déjà inscrit dans l'ancienne édition ? (insensible à la casse)
  db.query(
    'SELECT id FROM participants WHERE LOWER(pseudo) = LOWER(?) LIMIT 1',
    [pseudo],
    (err, r1) => {
      if (err) {
        console.error(" DB (check ancienne table):", err.sqlMessage || err);
        return res.status(500).json({ message: "Erreur DB (check ancienne table)" });
      }
      if (r1.length > 0) {
        return res.status(409).json({ message: "Tu as déjà participé à une édition précédente !" });
      }

      // 2) déjà inscrit dans l'édition en cours ? (insensible à la casse)
      db.query(
        'SELECT id FROM participants_PT WHERE LOWER(pseudo) = LOWER(?) LIMIT 1',
        [pseudo],
        (err2, r2) => {
          if (err2) {
            console.error(" DB (check table actuelle):", err2.sqlMessage || err2);
            return res.status(500).json({ message: "Erreur DB (check table actuelle)" });
          }
          if (r2.length > 0) {
            return res.status(409).json({ message: "Tu as déjà participé cette semaine !" });
          }

          // 3) insérer dans la table de la semaine en cours
          const sql = `
            INSERT INTO participants_PT (prenom, pseudo, village, taille, date_participation)
            VALUES (?, ?, ?, ?, CURDATE())
          `;
          db.query(sql, [prenom, pseudo, village, taille], (err3) => {
            if (err3) {
              console.error(" INSERT participants_PT:", err3.sqlMessage || err3);
              return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
            }
            res.status(200).json({ message: " Participation enregistrée !" });
          });
        }
      );
    }
  );
});

// -------------------------
// GET /api/participants : liste semaine en cours
// -------------------------
app.get('/api/participants', (req, res) => {
  db.query('SELECT * FROM participants_PT ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error(" Erreur lors de la récupération des participants :", err.sqlMessage || err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(results);
  });
});

// -------------------------
// /diag : test rapide (ne modifie rien)
// -------------------------
app.get('/diag', (req, res) => {
  const out = {};
  db.query('SELECT 1 AS ok', (e1) => {
    out.db = e1 ? 'ko' : 'ok';
    db.query('SELECT COUNT(*) AS c FROM participants', (e2, r2) => {
      out.participants = e2 ? 'ko' : `ok (${r2?.[0]?.c ?? 0})`;
      db.query('SELECT COUNT(*) AS c FROM participants_PT', (e3, r3) => {
        out.participants_PT = e3 ? 'ko' : `ok (${r3?.[0]?.c ?? 0})`;
        res.json(out);
      });
    });
  });
});

// -------------------------
// Démarrage serveur
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Serveur lancé sur le port ${PORT}`);
});

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
// (Optionnel) Liste officielle des villages via l'API
// ----------------------------------------------------
const VILLAGES_MAYOTTE = [
  // Acoua
  "Acoua","Mtsangadoua",
  // Bandraboua
  "Bandraboua","Handrema","Mtsangamboua",
  // Bandrélé
  "Bandrélé","Hamouro","Dapani","Mtsamoudou",
  // Bouéni
  "Bouéni","Bambo-Ouest","Mbouanatsa","Majiméouni","Mzouazia","Hagnoundrou",
  // Chiconi
  "Chiconi","Miréréni",
  // Chirongui
  "Chirongui","Mramadoudou","Poroani","Tsimkoura","Bambo-Est",
  // Dembéni
  "Dembéni","Iloni","Tsararano",
  // Dzaoudzi-Labattoir (Petite-Terre)
  "Dzaoudzi","Labattoir",
  // Kani-Kéli
  "Kani-Kéli","Passy-Kéli",
  // Koungou
  "Koungou","Majicavo Lamir","Majicavo Koropa","Longoni","Trévani",
  // Mamoudzou
  "Mamoudzou","Cavani","Vahibé","Passamainty","M’Tsapéré","Kawéni",
  // Mtsamboro
  "Mtsamboro","Hamjago","Mtsahara",
  // M’Tsangamouji
  "M’Tsangamouji","Mliha",
  // Ouangani
  "Ouangani","Coconi","Kahani",
  // Pamandzi (Petite-Terre)
  "Pamandzi",
  // Sada
  "Sada","Mangajou",
  // Tsingoni
  "Tsingoni","Combani","Mroalé"
];

app.get('/api/villages', (_req, res) => {
  const uniques = Array.from(new Set(VILLAGES_MAYOTTE));
  uniques.sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base',ignorePunctuation:true}));
  res.json(uniques);
});

// ----------------------------------------------------
// POST /submit : bloque gagnants + 1 participation max cette semaine
// ----------------------------------------------------
app.post('/submit', (req, res) => {
  let { prenom, pseudo, village, taille } = req.body;

  // Nettoyage + normalisation
  prenom  = (prenom  || '').trim();
  pseudo  = (pseudo  || '').trim();
  village = (village || '').trim();
  taille  = (taille  || '').trim();
  const pseudoNorm = pseudo.toLowerCase();

  if (!prenom || !pseudo || !village || !taille) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  // (Optionnel) valider le village contre la liste officielle si tu l'utilises
  const isVillageOk = typeof VILLAGES_MAYOTTE !== 'undefined'
    ? VILLAGES_MAYOTTE.some(v => v.localeCompare(village, 'fr', { sensitivity: 'base', ignorePunctuation: true }) === 0)
    : true;
  if (!isVillageOk) {
    return res.status(400).json({ message: "Village invalide" });
  }

  // 1) Bloquer si déjà gagnant
  const CHECK_WINNER = `SELECT 1 FROM gagnants WHERE LOWER(pseudo) = ? LIMIT 1`;
  db.query(CHECK_WINNER, [pseudoNorm], (err1, rows1) => {
    if (err1) {
      console.error("❌ DB (check gagnant):", err1.sqlMessage || err1);
      return res.status(500).json({ message: "Erreur DB (check gagnant)" });
    }
    if (rows1.length > 0) {
      return res.status(409).json({ message: "Tu es déjà gagnant(e) : tu ne peux plus participer au concours." });
    }

    // 2) Bloquer si déjà inscrit cette semaine (table participants_PT)
    const CHECK_THIS_WEEK = `SELECT 1 FROM participants_PT WHERE LOWER(pseudo) = ? LIMIT 1`;
    db.query(CHECK_THIS_WEEK, [pseudoNorm], (err2, rows2) => {
      if (err2) {
        console.error("❌ DB (check semaine):", err2.sqlMessage || err2);
        return res.status(500).json({ message: "Erreur DB (check semaine)" });
      }
      if (rows2.length > 0) {
        return res.status(409).json({ message: "Tu as déjà participé cette semaine !" });
      }

      // 3) OK -> Insérer la participation de la semaine en cours
      const INSERT_SQL = `
        INSERT INTO participants_PT (prenom, pseudo, village, taille, date_participation)
        VALUES (?, ?, ?, ?, CURDATE())
      `;
      db.query(INSERT_SQL, [prenom, pseudo, village, taille], (err3) => {
        if (err3) {
          console.error("❌ INSERT participants_PT:", err3.sqlMessage || err3);
          return res.status(500).json({ message: "Erreur lors de l'enregistrement" });
        }
        return res.status(200).json({ message: "Participation enregistrée !" });
      });
    });
  });
});


// -----------------------------------------------------
// GET /api/participants : liste des inscrits (semaine en cours)
// -----------------------------------------------------
app.get('/api/participants', (_req, res) => {
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
app.get('/diag', (_req, res) => {
  const out = {};
  db.query('SELECT 1 AS ok', (e1) => {
    out.db = e1 ? 'ko' : 'ok';

    db.query('SELECT COUNT(*) AS c FROM participants', (e2, r2) => {
      out.participants = e2 ? 'ko' : `ok (${r2?.[0]?.c ?? 0})`;

      db.query('SELECT COUNT(*) AS c FROM participants_petit_terre', (e3, r3) => {
        out.participants_petit_terre = e3 ? 'ko' : `ok (${r3?.[0]?.c ?? 0})`;

        db.query('SELECT COUNT(*) AS c FROM participants_PT', (e4, r4) => {
          out.participants_PT = e4 ? 'ko' : `ok (${r4?.[0]?.c ?? 0})`;

          db.query('SELECT COUNT(*) AS c FROM gagnants', (e5, r5) => {
            out.gagnants = e5 ? 'ko' : `ok (${r5?.[0]?.c ?? 0})`;
            res.json(out);
          });
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

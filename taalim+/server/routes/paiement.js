const express = require('express');
const router = express.Router();
const db = require('../dbConnexion');
const cors = require('cors');

router.use(cors());

// Error handler middleware
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get all students with unpaid sessions
router.get('/students', asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      e.idEleve as id,
      e.nomEleve || ' ' || e.prenomEleve as name,
      g.nomGroupe as "groupName",
      g.tarifGroupe as sessionPrice,
      COUNT(DISTINCT s.idSeance) as unpaidSessions,
      COUNT(DISTINCT s.idSeance) * p.tarifSeance as amountDue
    FROM eleve e
    JOIN groupe g ON e.idGroupe = g.idGroupe
    JOIN seance s ON s.idGroupe = g.idGroupe
    LEFT JOIN paiement p ON p.idEleve = e.idEleve AND p.idSeance = s.idSeance
    WHERE e.actif = 1 
    AND (p.statutPaiement = 0)
    GROUP BY e.idEleve
  `;

  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }).then(rows => {
    res.json(rows || []);
  });
}));

// Get payment history
router.get('/history', (req, res) => {
  const query = `
    SELECT 
      p.idPaiement as id,
      e.nomEleve || ' ' || e.prenomEleve as studentName,
      g.nomGroupe as groupName,
      p.tarifSeance as amount,
      p.datePaiement as date,
      COUNT(p.idSeance) as sessions
    FROM paiement p
    JOIN eleve e ON p.idEleve = e.idEleve
    JOIN groupe g ON e.idGroupe = g.idGroupe
    WHERE p.statutPaiement = 1
    GROUP BY p.datePaiement, e.idEleve
    ORDER BY p.datePaiement DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.log(err);
      res.status(500).send([]);
      return;
    }
    res.json(rows ? rows : []);
  });
});

router.use(cors());

// ... (other routes remain unchanged)

// Get monthly revenue for school year
router.get('/revenue/:schoolYear', (req, res) => {
  const [startYear, endYear] = req.params.schoolYear.split('-').map(Number);
  const query = `
    SELECT 
      CASE 
        WHEN strftime('%m', p.datePaiement) >= '09' THEN strftime('%m', p.datePaiement)
        ELSE printf('%02d', strftime('%m', p.datePaiement) + 12)
      END as month,
      SUM(p.tarifSeance) as total,
      COUNT(DISTINCT p.idSeance) as sessions,
      COUNT(DISTINCT p.idEleve) as students
    FROM paiement p
    WHERE p.statutPaiement = 1 
    AND (
      (strftime('%Y', p.datePaiement) = ? AND strftime('%m', p.datePaiement) >= '09')
      OR 
      (strftime('%Y', p.datePaiement) = ? AND strftime('%m', p.datePaiement) <= '05')
    )
    GROUP BY month
    ORDER BY month
  `;

  db.all(query, [startYear.toString(), endYear.toString()], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get unpaid sessions for a student
router.get('/unpaid-sessions/:studentId', (req, res) => {
  const query = `
    SELECT 
      s.idSeance as id,
      s.dateSeance as date,
      p.tarifSeance as amount
    FROM seance s
    JOIN groupe g ON s.idGroupe = g.idGroupe
    JOIN eleve e ON e.idGroupe = g.idGroupe
    LEFT JOIN paiement p ON p.idSeance = s.idSeance AND p.idEleve = e.idEleve
    WHERE e.idEleve = ?
    AND (p.statutPaiement = 0)
  `;

  db.all(query, [req.params.studentId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Process payment
router.post('/process', async (req, res) => {
  const { studentId, sessions, datePayment } = req.body;


  const updateQuery = `UPDATE paiement SET statutPaiement = ?, datePaiement = ? WHERE idSeance= ? AND idEleve = ?`

  await sessions.forEach(session => {
    db.run(updateQuery, [1,datePayment, session.id, studentId], (err) => {
      if (err)
        res.status(500).send(err);
    });
  });

  res.sendStatus(200);

});

router.get('/dashboard-stats', (req, res) => {
  const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = new Date().getFullYear();

  const queries = {
    currentMonthRevenue: `
      SELECT SUM(p.tarifSeance) as total
      FROM paiement p
      WHERE p.statutPaiement = 1 
      AND strftime('%m', p.datePaiement) = ?
      AND strftime('%Y', p.datePaiement) = ?
    `,
    urgentPaymentsAmount: `
SELECT SUM(sub.totalPaymentAmount) AS totalPaymentAmount
FROM (
    SELECT 
        CASE 
            -- Cas où un élève a 5 séances ou plus non payées : Comptabiliser seulement 4 séances
            WHEN COUNT(DISTINCT s.idSeance) >= 5 THEN 
                4 * COALESCE(e.tarifSpecial, g.tarifGroupe)
            -- Cas où un élève a exactement 3 ou 4 séances non payées : Ajouter une 4ème séance
            WHEN COUNT(DISTINCT s.idSeance) = 3 THEN 
                SUM(p.tarifSeance) + COALESCE(e.tarifSpecial, g.tarifGroupe)
            ELSE 
                SUM(p.tarifSeance) -- Par défaut, somme des tarifs normaux
        END AS totalPaymentAmount
    FROM eleve e
    JOIN groupe g ON e.idGroupe = g.idGroupe
    JOIN seance s ON s.idGroupe = g.idGroupe
    LEFT JOIN paiement p ON p.idEleve = e.idEleve AND p.idSeance = s.idSeance
    WHERE p.statutPaiement = 0
    GROUP BY e.idEleve
    HAVING COUNT(DISTINCT s.idSeance) >= 3
) AS sub;


    `,
    unpaidStudentsCount: `
      SELECT COUNT(*) AS count
      FROM (
          SELECT e.idEleve
          FROM eleve e
          JOIN seance s ON s.idGroupe = e.idGroupe
          LEFT JOIN paiement p ON p.idEleve = e.idEleve AND p.idSeance = s.idSeance
          WHERE p.statutPaiement = 0
          GROUP BY e.idEleve
          HAVING COUNT(DISTINCT s.idSeance) >= 3
      ) AS subquery
    `
  };

  const stats = {};

  const executeQuery = (query, params) => {
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  Promise.all([
    executeQuery(queries.currentMonthRevenue, [currentMonth.toString().padStart(2, '0'), currentYear.toString()]),
    executeQuery(queries.urgentPaymentsAmount, []),
    executeQuery(queries.unpaidStudentsCount, [])
  ])
    .then(([revenueRow, urgentAmountRow, unpaidCountRow]) => {
      stats.currentMonthRevenue = revenueRow.total || 0;
      stats.urgentPaymentsAmount = urgentAmountRow.totalPaymentAmount || 0;
      stats.unpaidStudentsCount = unpaidCountRow.count || 0;
      res.json(stats);
    })
    .catch(err => {
      console.error('Error fetching dashboard stats:', err);
      res.status(500).json({ error: 'An error occurred while fetching dashboard stats' });
    });
});

module.exports = router;

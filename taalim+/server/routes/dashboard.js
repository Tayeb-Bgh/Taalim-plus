const express = require('express');
const router = express.Router();
const db = require('../dbConnexion');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Get total active students
        const studentsQuery = `
            SELECT COUNT(*) as total 
            FROM eleve 
            WHERE actif = 1
        `;

        // Get active groups
        const groupsQuery = `
            SELECT COUNT(*) as total 
            FROM groupe
        `;

        // Get this week's sessions
        const currentDate = new Date();
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        function toFormatSql(date) {
          return `${date.getFullYear()}-${(date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}`
        }

        const sessionsQuery = `
            SELECT COUNT(*) as total 
            FROM seance 
            WHERE dateSeance BETWEEN ? AND ?
        `;

        // Get monthly revenue
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const revenueQuery = `
            SELECT SUM(tarifSeance) as total 
            FROM paiement 
            WHERE datePaiement BETWEEN ? AND ?
        `;

        const [students, groups, sessions, revenue] = await Promise.all([
            new Promise((resolve, reject) => {
                db.get(studentsQuery, [], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            }),
            new Promise((resolve, reject) => {
                db.get(groupsQuery, [], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            }),
            new Promise((resolve, reject) => {
                db.get(sessionsQuery, [
                    `${toFormatSql(startOfWeek)} 00:00:00`,
                    `${toFormatSql(endOfWeek)} 23:59:59`
                ], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            }),
            new Promise((resolve, reject) => {
                db.get(revenueQuery, [
                    startOfMonth.toISOString(),
                    endOfMonth.toISOString()
                ], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            })
        ]);

        res.json({
            totalStudents: students.total,
            activeGroups: groups.total,
            weekSessions: sessions.total,
            monthlyRevenue: revenue.total || 0
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get revenue data for chart
router.get('/revenue', async (req, res) => {
    const query = `
        SELECT strftime('%Y-%m', datePaiement) as month,
               SUM(tarifSeance) as total
        FROM paiement
        WHERE statutPaiement=1
        GROUP BY month
        ORDER BY month DESC 
        
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching revenue data:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(rows);
        }
    });
});


// Get pending payments
router.get('/pending-payments', (req, res) => {
    const query = `
        SELECT e.nomEleve, e.prenomEleve,
               COUNT(s.idSeance) as unpaidSessions,
               SUM(p.tarifSeance) as totalAmount
        FROM eleve e
        JOIN seance s ON e.idGroupe = s.idGroupe
        LEFT JOIN paiement p ON s.idSeance = p.idSeance AND e.idEleve = p.idEleve
        WHERE p.statutPaiement = ?
        GROUP BY e.idEleve
        HAVING unpaidSessions > ?
    `;

    db.all(query, [0, 3], (err, rows) => {
        if (err) {
            console.error('Error fetching pending payments:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(rows);
        }
    });
});

router.get('/attendance-rate', async (req, res) => {
    const query = `
        WITH SessionCounts AS (
            SELECT s.idSeance,
                   COUNT(p.idPaiement) as presents,
                   COUNT(a.idAbsence) as absents
            FROM seance s
            LEFT JOIN paiement p ON s.idSeance = p.idSeance
            LEFT JOIN absence a ON s.idSeance = a.idSeance
            WHERE s.statutSeance = 1
            GROUP BY s.idSeance
        )
        SELECT ROUND(AVG(CAST(presents AS FLOAT) / (presents + absents) * 100), 2) as rate
        FROM SessionCounts
    `;

    db.get(query, [], (err, row) => {
        if (err) {
            console.error('Error calculating attendance rate:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json({ rate: row.rate || 0 });
        }
    });
});

// Add to your existing dashboardRouter.js
router.get('/next-sessions', (req, res) => {
    const query = `
        WITH UnpaidSessions AS (
    SELECT 
        p.idEleve,
        p.idPaiement,
        p.tarifSeance,
        e.idGroupe,
        e.tarifSpecial,
        ROW_NUMBER() OVER (PARTITION BY p.idEleve ORDER BY p.datePaiement) AS sessionRank
    FROM paiement p
    JOIN Eleve e ON p.idEleve = e.idEleve
    WHERE p.statutPaiement = 0
),
FilteredSessions AS (
    SELECT 
        idEleve,
        idGroupe,
        tarifSpecial,
        SUM(CASE WHEN sessionRank <= 4 THEN tarifSeance ELSE 0 END) AS total4Sessions,
        COUNT(*) AS unpaidCount
    FROM UnpaidSessions
    GROUP BY idEleve, idGroupe, tarifSpecial
)
SELECT 
    s.dateSeance,
    g.nomGroupe,
    COALESCE(SUM(
        CASE 
            -- Cas où un élève a 5 séances ou plus non payées
            WHEN sub.unpaidCount >= 5 THEN 
                -- Calculer uniquement 4 séances
                4 * COALESCE(sub.tarifSpecial, g.tarifGroupe)
            -- Cas où un élève a exactement 3 ou 4 séances non payées
            WHEN sub.unpaidCount >= 3 THEN 
                sub.total4Sessions + COALESCE(sub.tarifSpecial, g.tarifGroupe)
            ELSE 0
        END
    ), 0) AS totalAmount
FROM seance s
JOIN groupe g ON s.idGroupe = g.idGroupe
LEFT JOIN FilteredSessions sub ON s.idGroupe = sub.idGroupe
WHERE DATE(s.dateSeance) >= DATE('now', 'start of day')
AND s.statutSeance = 0
AND DATE(s.dateSeance) IN (
    SELECT MIN(DATE(dateSeance))
    FROM seance
    WHERE dateSeance >= DATE('now', 'start of day')
    AND statutSeance = 0
)
GROUP BY s.dateSeance, g.nomGroupe
ORDER BY s.dateSeance;



    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching next sessions:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(rows);
        }
    });
});



module.exports = router;
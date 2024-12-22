const express = require('express');
const router = express.Router();
const db = require('../dbConnexion');

// GET - Récupérer tous les groupes avec les élèves actifs
router.get('/', (req, res) => {
    const getGroupe = `SELECT groupe.*, idEleve, nomEleve, prenomEleve 
                       FROM groupe JOIN eleve 
                       ON groupe.idGroupe = eleve.idGroupe 
                       WHERE actif = 1 ORDER BY groupe.typeGroupe`;

    db.all(getGroupe, [], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des groupes:', err.message);
            res.sendStatus(500);
        } else {
            res.json(rows);
        }
    });
});

// GET - Récupérer les groupes sans étudiants
router.get('/sans-etudiants', (req, res) => {
    const getGroupesSansEtudiants = `
        SELECT g.idGroupe, g.nomGroupe, g.typeGroupe, g.tarifGroupe
        FROM groupe g
        LEFT JOIN eleve e ON g.idGroupe = e.idGroupe AND e.actif = 1
        WHERE e.idEleve IS NULL 
        AND (g.actifGroupe IS NULL OR g.actifGroupe NOT IN (0));
    `;

    db.all(getGroupesSansEtudiants, [], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des groupes sans étudiants:', err.message);
            res.status(500).send('Erreur interne du serveur');
        } else {
            res.json(rows);
        }
    });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;

    // Première requête : Mise à jour (actifGroupe = 0 si idGroupe existe dans la table seance)
    const updateGroupe = `
        UPDATE groupe 
        SET actifGroupe = 0 
        WHERE idGroupe = ? AND idGroupe IN (
            SELECT idGroupe FROM seance
        )
    `;

    db.run(updateGroupe, [id], (err) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du groupe:', err.message);
            res.sendStatus(500);
        } else {
            // Deuxième requête : Suppression (si idGroupe n'est pas utilisé dans la table seance)
            const deleteGroupe = `
                DELETE FROM groupe 
                WHERE idGroupe = ? AND idGroupe NOT IN (
                    SELECT idGroupe FROM seance
                )
            `;

            db.run(deleteGroupe, [id], (err) => {
                if (err) {
                    console.error('Erreur lors de la suppression du groupe:', err.message);
                    res.sendStatus(500);
                } else {
                    console.log('Groupe traité avec succès (supprimé ou désactivé)');
                    res.sendStatus(200);
                }
            });
        }
    });
});

// GET - Récupérer le nom des groupes
router.get('/nom', (req, res) => {
    const getName = `SELECT idGroupe, nomGroupe FROM groupe g 
                     WHERE (g.actifGroupe IS NULL OR g.actifGroupe NOT IN (0))`;
    db.all(getName, [], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des noms de groupe:', err.message);
            res.sendStatus(500);
        } else {
            res.json(rows);
        }
    });
});

// GET - Récupérer le tarif des groupes
router.get('/tarif', (req, res) => {
    const getTarif = `SELECT idGroupe, nomGroupe, tarifGroupe FROM groupe`;
    db.all(getTarif, [], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des tarifs de groupe:', err.message);
            res.sendStatus(500);
        } else {
            res.json(rows);
        }
    });
});

// Fonction utilitaire pour exécuter des requêtes avec des promesses
const executeQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
};

// POST - Ajouter un nouveau groupe et mettre à jour les étudiants
router.post('/', async (req, res) => {
    const { nomGroupe, selectedStudent, typeGroupe, tarifGroupe } = req.body;
    const addGroupe = 'INSERT INTO groupe (nomGroupe, typeGroupe, tarifGroupe) VALUES (?, ?, ?)';
    const updateEleve = 'UPDATE eleve SET idGroupe = ? WHERE idEleve = ?';

    try {
        const result = await executeQuery(addGroupe, [nomGroupe, typeGroupe, Number(tarifGroupe)]);
        const groupeId = result.lastID;

        for (let idStd of selectedStudent) {
            await executeQuery(updateEleve, [groupeId, Number(idStd)]);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Erreur lors de l\'ajout du groupe ou de la mise à jour des étudiants:', err.message);
        res.sendStatus(400);
    }
});

// PATCH - Retirer un étudiant d'un groupe
router.patch('/etudiant/retirer/:id', (req, res) => {
    const idEleve = req.params.id;
    const idGroupeSetNull = `UPDATE eleve SET idGroupe = NULL WHERE idEleve = ?`;

    db.run(idGroupeSetNull, [idEleve], (err) => {
        if (err) {
            console.error('Erreur lors de la suppression de l\'idGroupe:', err.message);
            res.sendStatus(500);
        } else {
            console.log('idGroupe supprimé avec succès');
            res.sendStatus(200);
        }
    });
});

// PATCH - Ajouter un étudiant à un groupe
router.patch('/etudiant/ajouter/', (req, res) => {
    const { selectedStudent, idGroupe } = req.body;
    const idGroupeSet = `UPDATE eleve SET idGroupe = ? WHERE idEleve = ?`;

    for (let idStd of selectedStudent) {
        db.run(idGroupeSet, [idGroupe, Number(idStd)], (err) => {
            if (err) {
                console.error('Erreur lors de la mise à jour de l\'idGroupe:', err.message);
                res.sendStatus(500);
                return; // Arrêter en cas d'erreur pour éviter les réponses multiples
            } else {
                console.log('idGroupe mis à jour avec succès');
            }
        });
    }
    res.sendStatus(200);
});

module.exports = router;

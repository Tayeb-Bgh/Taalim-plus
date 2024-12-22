const express = require('express');
const router = express.Router();
const db = require('../dbConnexion');

// GET - Récupérer tous les étudiants actifs
router.get('/', (req, res) => {
    const getStd = `SELECT idEleve, nomEleve, prenomEleve, numeroTel, anneeEleve, eleve.idGroupe, nomGroupe, tarifSpecial 
                    FROM eleve LEFT JOIN groupe 
                    ON eleve.idGroupe = groupe.idGroupe 
                    WHERE actif = 1 ORDER BY groupe.idGroupe`;

    db.all(getStd, [], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des étudiants:', err.message);
            res.status(500).send(err.message);
        } else {
            res.json(rows);
        }
    });
});

// POST - Ajouter un nouvel étudiant
router.post('/', (req, res) => {
    const addStd = `INSERT INTO eleve(nomEleve, prenomEleve, anneeEleve, numeroTel, idGroupe, actif, tarifSpecial) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const numero = req.body.telephone ? parseInt(req.body.telephone, 10) : null;
    const idGroupe = req.body.idGroupe ? parseInt(req.body.idGroupe, 10) : null;
    const tarifSpecial = req.body.tarifSpecial ? parseInt(req.body.tarifSpecial) : null;

    db.run(addStd, [req.body.nom, req.body.prenom, req.body.annee, numero, idGroupe, 1, tarifSpecial], function(err) {
        if (err) {
            console.error('Erreur lors de l\'insertion des données:', err.message);
            res.status(500).send(err.message);
        } else {
            console.log('Données insérées avec succès');
            res.sendStatus(200);
        }
    });
});

// PUT - Mettre à jour les informations d'un étudiant
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { body } = req;
    const updateStd = `UPDATE eleve SET nomEleve = ?, prenomEleve = ?, anneeEleve = ?, numeroTel = ?, idGroupe = ?, tarifSpecial = ? WHERE idEleve = ?`;

    db.run(updateStd, [
        body.nom, 
        body.prenom, 
        body.annee, 
        body.telephone ? body.telephone : null, 
        body.idGroupe ? Number(body.idGroupe) : null, 
        body.tarifSpecial ? parseFloat(body.tarifSpecial) : null,
        id
    ], function(err) {
        if (err) {
            console.error('Erreur lors de la mise à jour des données:', err.message);
            res.sendStatus(400);
        } else {
            console.log('Données mises à jour avec succès');
            res.sendStatus(200);
        }
    });
});


// DELETE - Supprimer ou désactiver un étudiant
const executeQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    const verifyPayment = `SELECT idEleve FROM paiement WHERE idEleve = ?`;
    const sqlDeleteStd = `DELETE FROM eleve 
        WHERE idEleve = ? 
        AND idEleve NOT IN (SELECT idEleve FROM paiement)`;
    const sqlUpdateStd = `UPDATE eleve SET actif = 0 WHERE idEleve = ?`;

    try {
        const result = await executeQuery(verifyPayment, [id]);

        if (result.length === 0) {
            await executeQuery(sqlDeleteStd, [id]);
            console.log('Données supprimées avec succès');
            res.sendStatus(200);
        } else {
            await executeQuery(sqlUpdateStd, [id]);
            console.log('Données modifiées avec succès');
            res.sendStatus(201);
        }

    } catch (err) {
        console.error('Erreur lors du traitement des données:', err.message);
        res.status(500).json({ error: 'Erreur lors du traitement des données' });
    }
});

// GET - Récupérer les noms d'étudiants sans groupe
router.get('/nom', (req, res) => {
    const getName = `SELECT idEleve, nomEleve, prenomEleve FROM eleve WHERE actif = ? AND idGroupe IS ?`;
    db.all(getName, [1, null], (err, result) => {
        if (err) {
            console.error('Erreur lors de la récupération des noms:', err.message);
            res.sendStatus(500);
        } else {
            res.json(result);
        }
    });
});

module.exports = router;

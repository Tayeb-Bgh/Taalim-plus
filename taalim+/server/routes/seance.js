const express = require('express');
const router = express.Router();
const db = require('../dbConnexion');

function isDateLessOrEqual(date1, date2) {
    if (date1.getFullYear() < date2.getFullYear()) return true;
    if (date1.getFullYear() > date2.getFullYear()) return false;
    if (date1.getMonth() < date2.getMonth()) return true;
    if (date1.getMonth() > date2.getMonth()) return false;
    return date1.getDate() <= date2.getDate();
}

// GET - Récupérer les séances entre deux dates
router.get('/', (req, res) => {
    const getStd = `SELECT seance.*, nomGroupe FROM seance 
                    JOIN groupe ON seance.idGroupe = groupe.idGroupe 
                    WHERE dateSeance BETWEEN ? AND ?`;

    db.all(getStd, [`${req.query.startDate} 00:00:00`, `${req.query.endDate} 23:59:59`], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des séances:', err.message);
            res.sendStatus(500);
        } else {
            res.json(rows);
        }
    });
});

function checkSeanceConflict(dateSeance) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT COUNT(*) as count FROM seance WHERE dateSeance = ?';
        db.get(query, [dateSeance], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.count > 0);
            }
        });
    });
}

// POST - Ajouter une séance et générer automatiquement d'autres séances si nécessaire
router.post('/', async (req, res) => {
    const addSeance = `INSERT INTO seance (dateSeance, prixSeance, statutSeance, typeSeance, idGroupe) VALUES (?, ?, ?, ?, ?)`;

    const { prixSeance, typeSeance, idGroupe, statutSeance, dateSeance, endDate } = req.body;

    const dateSeanceObj = new Date(dateSeance);
    const endDateObj = endDate ? new Date(endDate) : new Date(dateSeance);

    const toDateTime = (dateSeance) => `${dateSeance.getFullYear()}-${dateSeance.getMonth() + 1 < 10 ? '0' + (dateSeance.getMonth() + 1) : (dateSeance.getMonth() + 1)}-${dateSeance.getDate() < 10 ? '0' + dateSeance.getDate() : dateSeance.getDate()} ${dateSeance.getHours() < 10 ? `0${dateSeance.getHours()}` : dateSeance.getHours()}:00:00`;

    if (Number(typeSeance) === 1) {
        // Séance pour cette semaine seulement
        const dateTime = toDateTime(dateSeanceObj);
        try {
            const conflict = await checkSeanceConflict(dateTime);
            if (conflict) {
                return res.status(400).send(`Une séance existe déjà à la date et heure ${dateTime}.`);
            }

            db.run(addSeance, [dateTime, prixSeance, statutSeance, Number(typeSeance), idGroupe], (err) => {
                if (err) {
                    console.error('Erreur lors de l\'insertion des données:', err.message);
                    res.sendStatus(500);
                } else {
                    console.log('Séance ajoutée avec succès!');
                    res.sendStatus(200);
                }
            });
        } catch (err) {
            console.error('Erreur lors de la vérification des conflits:', err.message);
            res.sendStatus(500);
        }
    } else {
        // Séances hebdomadaires
        if (!endDate) {
            res.status(400).send('La date limite est requise pour les séances hebdomadaires.');
            return;
        }

        let currentDate = new Date(dateSeanceObj);
        const adjustedEndDateObj = new Date(endDateObj);
        adjustedEndDateObj.setHours(23, 59, 59, 999); // Inclure toute la journée de la date limite

        const conflictingDates = [];
        const insertedDates = [];

        while (currentDate <= adjustedEndDateObj) {
            const dateTime = toDateTime(currentDate);

            try {
                const conflict = await checkSeanceConflict(dateTime);
                if (conflict) {
                    conflictingDates.push(dateTime);
                } else {
                    await new Promise((resolve, reject) => {
                        db.run(addSeance, [dateTime, prixSeance, statutSeance, Number(typeSeance), idGroupe], (err) => {
                            if (err) {
                                console.error('Erreur lors de l\'insertion des données:', err.message);
                                reject(err);
                            } else {
                                console.log('Séance ajoutée avec succès pour le ', dateTime);
                                insertedDates.push(dateTime);
                                resolve();
                            }
                        });
                    });
                }
            } catch (err) {
                console.error('Erreur lors de la vérification des conflits:', err.message);
                res.sendStatus(500);
                return;
            }

            currentDate.setDate(currentDate.getDate() + 7);
        }

        let message = 'Séances ajoutées avec succès.';
        if (conflictingDates.length > 0) {
            message += `\nLes séances aux dates suivantes n'ont pas été ajoutées car elles entrent en conflit avec des séances existantes: ${conflictingDates.join(', ')}.`;
        }

        res.status(200).send(message);
    }
});

router.delete('/delete/:id', (req, res) => {
    const idSeance = Number(req.params.id);

    const getSeanceDetails = 'SELECT * FROM seance WHERE idSeance = ?';

    db.get(getSeanceDetails, [idSeance], (err, seance) => {
        if (err) {
            console.error('Erreur lors de la récupération de la séance:', err.message);
            res.sendStatus(500);
        } else if (!seance) {
            console.log('Séance non trouvée');
            res.sendStatus(404);
        } else {
            // Maintenant que nous avons les détails de la séance
            if (seance.typeSeance == 0) {
                // Séance hebdomadaire
                // Supprimer toutes les séances futures avec le même groupe, jour de la semaine et heure

                const idGroupe = seance.idGroupe;
                const dateSeance = seance.dateSeance; // 'YYYY-MM-DD HH:MM:SS'

                const deleteFutureSeances = `
                    DELETE FROM seance 
                    WHERE idGroupe = ?
                      AND typeSeance = 0
                      AND dateSeance >= ?
                      AND strftime('%w', dateSeance) = strftime('%w', ?)
                      AND strftime('%H:%M:%S', dateSeance) = strftime('%H:%M:%S', ?)
                `;

                db.run(deleteFutureSeances, [idGroupe, dateSeance, dateSeance, dateSeance], function(err) {
                    if (err) {
                        console.error('Erreur lors de la suppression des séances hebdomadaires:', err.message);
                        res.sendStatus(500);
                    } else {
                        console.log('Séances hebdomadaires supprimées avec succès');
                        res.sendStatus(200);
                    }
                });
            } else {
                // Supprimer uniquement la séance sélectionnée
                const deleteSeance = 'DELETE FROM seance WHERE idSeance = ?';

                db.run(deleteSeance, [idSeance], (err) => {
                    if (err) {
                        console.error('Erreur lors de la suppression de la séance:', err.message);
                        res.sendStatus(500);
                    } else {
                        console.log('Séance supprimée avec succès');
                        res.sendStatus(200);
                    }
                });
            }
        }
    });
});

// GET - Récupérer les étudiants actifs ayant un groupe
router.get('/etudiant/nom', (req, res) => {
    const getName = `SELECT idEleve, nomEleve, prenomEleve, idGroupe FROM eleve WHERE actif = 1 AND idGroupe IS NOT NULL`;

    db.all(getName, [], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des noms des étudiants:', err.message);
            res.sendStatus(500);
        } else {
            res.json(rows);
        }
    });
});


router.post('/presence', async (req, res) => {
    const { idEtudiants, idSeance, prixSeance } = req.body;

    const selectTarifSpecial = `SELECT tarifSpecial, idEleve FROM eleve WHERE idEleve IN (${idEtudiants.map(() => '?').join(', ')})`;
    const addPresence = `INSERT INTO paiement (statutPaiement, idEleve, idSeance, datePaiement, tarifSeance) VALUES (?, ?, ?, ?, ?)`;
    const updateSeance = `UPDATE seance SET prixSeance = ?, statutSeance = ? WHERE idSeance = ?`;


    try {
        // Étape 1 : Récupérer tarifSpecial et idEtudiant pour chaque étudiant
        const tarifs = await new Promise((resolve, reject) => {
            db.all(selectTarifSpecial, idEtudiants, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        // Étape 2 : Ajouter la présence pour chaque étudiant
        await Promise.all(idEtudiants.map(idStd => {
            let prixSpecial = tarifs.find(std => std.idEleve === idStd).tarifSpecial;
            let price = prixSpecial ? (prixSpecial < prixSeance ? prixSpecial : prixSeance) : prixSeance;
            new Promise((resolve, reject) => {
                db.run(addPresence, [0, Number(idStd), Number(idSeance), '2024-10-26', price], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            })
        }
        ));

        // Étape 3 : Mettre à jour la séance
        await new Promise((resolve, reject) => {
            db.run(updateSeance, [Number(prixSeance), 1, Number(idSeance)], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Réponse de succès après toutes les opérations
        res.sendStatus(200);
        console.log('Toutes les opérations ont été effectuées avec succès');

    } catch (error) {
        console.error('Erreur lors de l\'exécution des opérations:', error.message);
        res.sendStatus(500);
    }
});

router.post('/absence', function (req, res) {
    const { idEtudiants, idSeance, dateSeance } = req.body;

    const addPayment = 'INSERT INTO absence(`idEleve`,`idSeance`) VALUES ( ?, ? ) ';

    for (idEtd of idEtudiants) {
        db.run(addPayment, [idEtd, idSeance], (err, result) => {
            if (!err) {
                console.log('Absence ajouté avec succès');
            }
            else {
                console.error('Erreur lors de l\'ajout de l\'absence:', err.message);
            }
        })
    }
})


/* // POST - Ajouter la présence et mettre à jour le statut de la séance
router.post('/presence', (req, res) => {
    const addPresence = `INSERT INTO paiement (statutPaiement, idEleve, idSeance) VALUES (?, ?, ?)`;
    const { idEtudiants, idSeance, prixSeance } = req.body;



    for (let idStd of idEtudiants) {
        db.run(addPresence, [0, Number(idStd), Number(idSeance)], (err) => {
            if (err) {
                console.error('Erreur lors de l\'ajout de la présence:', err.message);
                res.sendStatus(500);
                return; // Quitter en cas d'erreur pour éviter les multiples réponses
            } else {
                console.log('Paiement ajouté avec succès');
            }
        });
    }

    const updateSeance = `UPDATE seance SET prixSeance = ?, statutSeance = ? WHERE idSeance = ?`;

    db.run(updateSeance, [Number(prixSeance), 1, Number(idSeance)], (err) => {
        if (err) {
            console.error('Erreur lors de la mise à jour de la séance:', err.message);
            res.sendStatus(500);
        } else {
            console.log('Séance mise à jour avec succès');
            res.sendStatus(200);
        }
    });
});
 */
router.patch('/cancel/:id', (req, res) => {
    const id = Number(req.params.id);

    const cancelSeance = 'UPDATE seance SET statutSeance = ? WHERE idSeance= ?';

    db.run(cancelSeance,
        [2, id], (err) => {
            if (err) {
                console.error('Erreur lors de la suppression de la séance:', err.message);
                res.sendStatus(500);
            } else {
                console.log('Séance annulée avec succès');
                res.sendStatus(200);
            }
        })
});

router.get('/historique', async (req, res) => {
    const getHistorique = `SELECT seance.idSeance, dateSeance, prixSeance, typeSeance, nomGroupe, COUNT(idPaiement) as totalPresents  
                           FROM seance 
                           JOIN paiement ON seance.idSeance = paiement.idSeance
                           JOIN groupe ON seance.idGroupe = groupe.idGroupe
                           GROUP BY seance.idSeance, dateSeance, prixSeance, typeSeance, nomGroupe`;

    const getAbsents = `SELECT idSeance, COUNT(idAbsence) as totalAbsents FROM absence 
                        GROUP BY idSeance`;

    try {
        const resultHistorique = await new Promise((resolve, reject) => {
            db.all(getHistorique, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        const resultAbsents = await new Promise((resolve, reject) => {
            db.all(getAbsents, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // Transformation de `resultAbsents` en un objet pour accès rapide par `idSeance`
        const absentsMap = Object.fromEntries(resultAbsents.map(abs => [abs.idSeance, abs.totalAbsents]));

        const finalResult = resultHistorique.map(his => ({
            ...his,
            totalAbsents: absentsMap[his.idSeance] || 0 // Assure 0 si non trouvé
        }));

        res.send(finalResult);
    } catch (err) {
        console.error('Erreur:', err);
        res.sendStatus(500);
    }
});


router.get('/historique/:id', async (req, res) => {
    const id = Number(req.params.id);

    const getPresents = `SELECT nomEleve, prenomEleve FROM eleve WHERE idEleve IN ( 
                                SELECT idEleve FROM paiement WHERE idSeance =? 
                                )`

    const getAbsents = `SELECT nomEleve, prenomEleve FROM eleve WHERE idEleve IN (
                                SELECT idEleve FROM absence WHERE idSeance =?
                                )`

    try {
        const resultPresent = await new Promise((resolve, reject) => {
            db.all(getPresents, [id], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        })

        const resultAbsent = await new Promise((resolve, reject) => {
            db.all(getAbsents, [id], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            })
        })

        res.send({
            presents: resultPresent,
            absents: resultAbsent
        })
    } catch (err) {
        console.log('l\'erreur est : ' + err);
        res.sendStatus(500);
    }



});

router.get('/absences', (req, res) => {
    const getAbsences = `SELECT absence.idEleve,nomGroupe, nomEleve, prenomEleve, COUNT(idAbsence) AS nombreAbsences FROM absence
                         JOIN eleve ON eleve.idEleve = absence.idEleve
                         JOIN groupe ON eleve.idGroupe = groupe.idGroupe
                         GROUP BY absence.idEleve,nomEleve,prenomEleve`

    db.all(getAbsences,[],(err,result)=>{
        if(!err){
            console.log("donnees d'absences recuperer")
            res.send(result)
        }else{
            console.log('erreur : '+err)
            res.sendStatus(500)
        }
    })
});

router.get('/absences/:id', (req, res)=>{
    const id = Number(req.params.id);
    const getAbsences = `SELECT idAbsence, dateSeance, prixSeance FROM absence 
                         JOIN seance ON seance.idSeance = absence.idSeance
                         WHERE absence.idEleve = ?`

    db.all(getAbsences,[id],(err,result)=>{
        if(!err){
            console.log("donnees d'absences detailler recuperer")
            res.send(result)
        }else{
            console.log('erreur : '+err)
            res.sendStatus(500)
        }
    })
});

module.exports = router;

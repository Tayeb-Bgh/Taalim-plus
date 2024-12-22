SELECT 
    s.dateSeance, 
    g.nomGroupe,
    SUM(distinct p.tarifSeance) AS totalAmount
FROM seance s
JOIN groupe g ON s.idGroupe = g.idGroupe
JOIN paiement p 
WHERE DATE(s.dateSeance) IN (
    SELECT MIN(DATE(dateSeance))
    FROM seance
    WHERE dateSeance >= DATE('now') 
    AND statutSeance = 0
)

AND p.idEleve IN (
    SELECT idEleve
    FROM paiement
    WHERE statutPaiement = 0
    GROUP BY idEleve
    HAVING COUNT(*) >= 3
)
GROUP BY s.dateSeance, g.nomGroupe
ORDER BY s.dateSeance;
const mysql = require('mysql');

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "studyflowproject",
})

db.connect((err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err);
    throw err;
  }
  console.log('Connexion réussie à la base de données');
});

module.exports = db;

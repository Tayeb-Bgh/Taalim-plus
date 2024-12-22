const express = require('express');
const cors = require('cors');

const etudiantRouter = require('./routes/etudiant')
const groupeRouter = require('./routes/groupe')
const seanceRouter = require('./routes/seance')
const paiementRouter = require('./routes/paiement');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const port = 5000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(cors());

app.use('/etudiant', etudiantRouter);

app.use('/groupe', groupeRouter);

app.use('/seance', seanceRouter);

app.use('/paiement', paiementRouter);

app.use('/dashboard', dashboardRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

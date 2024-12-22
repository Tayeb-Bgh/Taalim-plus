import React, { useState, useEffect, useRef } from 'react'
import { format } from "date-fns"
import styles from './Seance.module.css' // Utilisation de CSS Modules
import StatCard from '../Utils/StatCard';
import { Calendar, CalendarCheck2, CalendarX2, Search } from 'lucide-react';


const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const heures = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
/* 
const mockSeances = [
  {
    idSeance: 1,
    dateSeance: '2023-10-07 08:00:00',
    prixSeance: 500,
    statutSeance: 0,
    typeSeance: 0,
    idGroupe: 1,
    nomGroupe: 'Groupe 4',
  },
  {
    idSeance: 2,
    dateSeance: '2023-10-07 10:00:00',
    prixSeance: 500,
    statutSeance: 0,
    typeSeance: 0,
    idGroupe: 1,
    nomGroupe: 'Groupe 1',
  },
  {
    idSeance: 3,
    dateSeance: '2023-10-08 08:00:00',
    prixSeance: 500,
    statutSeance: 0,
    typeSeance: 0,
    idGroupe: 1,
    nomGroupe: 'Groupe 1',
  },
  {
    idSeance: 4,
    dateSeance: '2023-10-08 14:00:00',
    prixSeance: 500,
    statutSeance: 0,
    typeSeance: 0,
    idGroupe: 1,
    nomGroupe: 'Groupe 2',
  },
  {
    idSeance: 5,
    dateSeance: '2023-10-09 10:00:00',
    prixSeance: 500,
    statutSeance: 0,
    typeSeance: 0,
    idGroupe: 1,
    nomGroupe: 'Groupe 3',
  },
]
 */

/* const mockEtudiants = [
  { idEleve: 1, nomComplet: 'Alice Johnson', idGroupe: 1 },
  { idEleve: 2, nomComplet: 'Bob Smith', idGroupe: 1 },
  { idEleve: 3, nomComplet: 'Charlie Brown', idGroupe: 2 },
  { idEleve: 4, nomComplet: 'Alice Johnson', idGroupe: 2 },
  { idEleve: 5, nomComplet: 'Bob Smith', idGroupe: 1 },
  { idEleve: 6, nomComplet: 'Charlie Brown', idGroupe: 2 },
]
 */
export default function SeanceTab() {
  const [seances, setSeances] = useState([])
  const [groupes, setGroupes] = useState([])
  const [groupesName, setGroupesName] = useState([])
  const [etudiants, setEtudiants] = useState([])
  const [selectedSeance, setSelectedSeance] = useState(null)
  const [historique, setHistorique] = useState([])
  const [isRecordingPresence, setIsRecordingPresence] = useState(false)
  const [presentEtudiants, setPresentEtudiants] = useState([])
  const [currentTarif, setCurrentTarif] = useState(10);
  const [selectedHistorySeance, setSelectedHistorySeance] = useState(null)
  const [activeTab, setActiveTab] = useState('emploi-du-temps')
  const [isAddingSeance, setIsAddingSeance] = useState(false)
  const [currentWeek, setCurrentWeek] = useState({ begin: new Date('0000-00-00'), end: new Date('0000-00-00') })
  const [reRenderData, setReRenderData] = useState(false);
  const [searchDate, setSearchDate] = useState();
  const [searchGroup, setSearchGroup] = useState();
  const [filteredHistorique, setFilteredHistorique] = useState([]);
  const [presentStatus, setPresentStatus] = useState(true);

  const [absences, setAbsences] = useState([])
  const [filteredAbsences, setFilteredAbsences] = useState([])
  const [searchAbsence, setSearchAbsence] = useState('')
  const [filterGroupAbsence, setFilterGroupAbsence] = useState('')
  const [selectedAbsenceUser, setSelectedAbsenceUser] = useState(null)

  const [message, setMessage] = useState(null);


  const modalRef = useRef(null)

  // Pour gerer le clique hors du modale
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        console.log("Click outside detected - closing modal");
        setSelectedSeance(null)
        setIsRecordingPresence(false)
        setSelectedHistorySeance(null)
        setIsAddingSeance(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      console.log("Removing event listener for click outside");
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function formatDate(date) {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

 
  useEffect(() => {
    const today = new Date();

    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());

    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);


    setCurrentWeek({
      begin: firstDayOfWeek,
      end: lastDayOfWeek,
    });

    

  }, []);

  function toFormatSql(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}`
  }

  // Pour recuperer les seances de la semaine actuel
  useEffect(() => {
    if (toFormatSql(currentWeek.begin)[0] !== "N")
      fetch(`http://localhost:5000/seance?startDate=${toFormatSql(currentWeek.begin)}&endDate=${toFormatSql(currentWeek.end)}`)
        .then(response => response.json())
        .then(data => {

          setSeances(data)
        });
  }, [currentWeek, reRenderData]);

  // Pour recuperer les etudiants
  useEffect(() => {
    fetch('http://localhost:5000/seance/etudiant/nom')
      .then(res => res.json())
      .then(data => {
        let tempTab = [];
        data.forEach(element => {
          tempTab = [...tempTab,
          {
            'idEleve': element.idEleve,
            'nomComplet': `${element.nomEleve} ${element.prenomEleve}`,
            'idGroupe': element.idGroupe
          }
          ]
        });
        setEtudiants(tempTab);
      })
    getGroupe();
    fetch('http://localhost:5000/groupe/nom')
      .then(res => res.json())
      .then(data => {
        setGroupesName(data);
      })
  }, []);

  function handlePreviousWeek() {
    const today = currentWeek.begin;

    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - 7);

    const lastDayOfWeek = new Date(today);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() - 1);

    setCurrentWeek({
      begin: firstDayOfWeek,
      end: lastDayOfWeek,
    });
  }

  function handleNextWeek() {
    const today = currentWeek.end;

    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() + 1);

    const lastDayOfWeek = new Date(today);
    lastDayOfWeek.setDate(today.getDate() + 7);

    setCurrentWeek({
      begin: firstDayOfWeek,
      end: lastDayOfWeek,
    });
  }


  const handleSeanceClick = (seance) => {
    setSelectedSeance(seance)
  }

  const handleRecordPresence = () => {
    setCurrentTarif(groupes.find(g => g.idGroupe === selectedSeance.idGroupe)?.tarifGroupe)
    setIsRecordingPresence(true)
    setPresentEtudiants([])
  }

  const toggleEtudiantPresence = (etudiantId) => {
    setPresentEtudiants(prev =>
      prev.includes(etudiantId)
        ? prev.filter(id => id !== etudiantId)
        : [...prev, etudiantId]
    )
  }

  const savePresence = () => {
    fetch('http://localhost:5000/seance/presence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idEtudiants: presentEtudiants,
        idSeance: selectedSeance.idSeance,
        prixSeance: currentTarif
      })
    })
      .then(() => setReRenderData(!reRenderData))

    const etudiantAbsent = etudiants
      .filter(etudiant => etudiant.idGroupe === selectedSeance.idGroupe)
      .filter(etudiant => !presentEtudiants.includes(etudiant.idEleve))
      .map(etudiant => etudiant.idEleve);


    fetch('http://localhost:5000/seance/absence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idEtudiants: etudiantAbsent,
        idSeance: selectedSeance.idSeance,
        dateAbsence: selectedSeance.dateSeance
      })
    })
      .then(() => console.log("absence ajouter ! "));



    setIsRecordingPresence(false)
    setSelectedSeance(null)
  }

  const handleCancelSeance = () => {
    fetch(`http://localhost:5000/seance/cancel/${selectedSeance.idSeance}`, {
      method: 'PATCH'
    })
      .then(() => console.log('seance annuler'))

    setSelectedSeance(null)
  }

  /* const handleDeleteSeance = () => {

    fetch(`http://localhost:5000/seance/delete/${selectedSeance.idSeance}`, {
      method: 'DELETE',
    })
      .then(() => {
        console.log('seance supprimé avec succes')
        setReRenderData(!reRenderData);
      })

    setSelectedSeance(null)
  } */
/* 
  const handleAddSeance = () => {
    const dateSeance = new Date(currentWeek.begin);
    dateSeance.setDate(Number(dateSeance.getDate()) + Number(newSeance.jour))

    const dateTime = `${dateSeance.getFullYear()}-${dateSeance.getMonth() + 1 < 10 ? '0' + (dateSeance.getMonth() + 1) : (dateSeance.getMonth() + 1)}-${dateSeance.getDate() < 10 ? '0' + dateSeance.getDate() : dateSeance.getDate()} ${newSeance.heure}:00`

    const newSeanceadd = {
      dateSeance: dateTime,
      prixSeance: 0,
      typeSeance: newSeance.typeSeance,
      statutSeance: 0,
      idGroupe: newSeance.idGroupe
    }

    fetch('http://localhost:5000/seance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' // Spécifie que le contenu est JSON
      },
      body: JSON.stringify(newSeanceadd)
    })
      .then(res => {
        console.log("seance ajouter a la bdd !");
        setReRenderData(!reRenderData);
      });

    setNewSeance({
      dateSeance: '',
      idGroupe: '',
      nomGroupe: '',
      typeSeance: 1,
      statutSeance: 0
    })
    setIsAddingSeance(false)
  } */

  const handleDeleteSeance = () => {
    let confirmMessage = 'Êtes-vous sûr de vouloir supprimer cette séance ?';
    if (selectedSeance.typeSeance == 0) {
        confirmMessage += '\nCela supprimera toutes les séances hebdomadaires futures de ce groupe au même horaire.';
    }
    if (window.confirm(confirmMessage)) {
        fetch(`http://localhost:5000/seance/delete/${selectedSeance.idSeance}`, {
            method: 'DELETE',
        })
            .then(() => {
                console.log('Séance supprimée avec succès');
                setReRenderData(!reRenderData);
            })
            .catch((error) => {
                console.error('Erreur lors de la suppression de la séance:', error);
            });

        setSelectedSeance(null);
    }
};


  const getSeanceStyle = (seance) => {
    switch (Number(seance.statutSeance)) {
      case 1:
        return styles['seance-done'];
      case 2:
        return styles['seance-cancelled'];
      default:
        return seance.typeSeance === 1 ? styles['seance-ponctuelle'] : styles['seance-hebdomadaire'];
    }
  }

  function getDateTimePart(dateTime, part) {
    const date = new Date(dateTime);
    if (part === 'jour') {
      return jours[date.getDay()]; // Renvoie le nom du jour basé sur l'indice
    }
    if (part === 'heure') {
      return format(date, 'HH:mm');
    }
    return date;
  }

  function getGroupe() {
    fetch('http://localhost:5000/groupe/tarif')
      .then(res => res.json())
      .then(data => {
        setGroupes(data);
      })
  }

  function getHistorique() {
    fetch('http://localhost:5000/seance/historique', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        setHistorique(data);
        console.log(data);
      })
  }

  function getHistoriqueDetails(seance) {

    fetch(`http://localhost:5000/seance/historique/${seance.idSeance}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        setSelectedHistorySeance({
          ...seance,
          'presentEtudiants': data.presents.map(eleve => `${eleve.nomEleve} ${eleve.prenomEleve}`),
          'absentEtudiants': data.absents.map(eleve => `${eleve.nomEleve} ${eleve.prenomEleve}`)
        })
      })
  }



  useEffect(() => {
    if (historique.length > 0) {
      setFilteredHistorique(
        historique.filter(seance => {
          const dateMatch = searchDate ? seance.dateSeance.includes(searchDate) : true
          const groupMatch = searchGroup ? seance.nomGroupe.toLowerCase().includes(searchGroup.toLowerCase()) : true
          return dateMatch && groupMatch
        })
      )
    }
  }, [historique, searchDate, searchGroup])


  useEffect(() => {
    if (activeTab === 'absences') {
      fetch('http://localhost:5000/seance/absences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(res => res.json())
        .then(data => {
          console.log("aucune erreur")
          const dataModified = data.map(eleve => {

            const newEleve = {
              ...eleve,
              nomEleve: `${eleve.nomEleve} ${eleve.prenomEleve}`
            }
            delete newEleve.prenomEleve;
            return newEleve;
          });


          setAbsences(dataModified)
          setFilteredAbsences(dataModified)
        })
        .catch(err => console.log(err));
    }
  }, [activeTab])

  useEffect(() => {
    setFilteredAbsences(
      absences.filter(absence =>
        (absence.nomEleve.toLowerCase().includes(searchAbsence.toLowerCase())) &&
        (filterGroupAbsence === '' || absence.nomGroupe === filterGroupAbsence)
      )
    )
  }, [absences, searchAbsence, filterGroupAbsence])

  function getAbsenceDetails(absence) {
    fetch(`http://localhost:5000/seance/absences/${absence.idEleve}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {

        setSelectedAbsenceUser({
          ...absence,
          nomEleve: absence.nomEleve.split(' ')[0],
          prenomEleve: absence.nomEleve.split(' ')[1],
          absences: [...data]
        })

      })

  }

  const [newSeance, setNewSeance] = useState({
    jour: '',
    heure: '',
    idGroupe: '',
    typeSeance: '0', // Par défaut "Séance pour chaque semaine"
    endDate: '',     // Nouvelle propriété pour la date limite
  })


  const handleAddSeance = () => {
    const dateSeance = new Date(currentWeek.begin);
    dateSeance.setDate(Number(dateSeance.getDate()) + Number(newSeance.jour))

    const dateTime = `${dateSeance.getFullYear()}-${dateSeance.getMonth() + 1 < 10 ? '0' + (dateSeance.getMonth() + 1) : (dateSeance.getMonth() + 1)}-${dateSeance.getDate() < 10 ? '0' + dateSeance.getDate() : dateSeance.getDate()} ${newSeance.heure}:00`

    const newSeanceadd = {
      dateSeance: dateTime,
      prixSeance: 0,
      typeSeance: newSeance.typeSeance,
      statutSeance: 0,
      idGroupe: newSeance.idGroupe,
      endDate: newSeance.typeSeance == 0 ? newSeance.endDate : null, // Ajout de endDate si nécessaire
    }

    fetch('http://localhost:5000/seance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSeanceadd)
    })
      .then(async res => {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text);
        }
        setMessage({ type: 'success', text });
        setReRenderData(!reRenderData);
      })
      .catch(err => {
        setMessage({ type: 'error', text: err.message });
      });

    setNewSeance({
      jour: '',
      heure: '',
      idGroupe: '',
      typeSeance: '0',
      endDate: '',
    })
    setIsAddingSeance(false)
  }

  return (
    <div className={styles['seance-tab']}>
      <div className={styles['seance-tab-container']}>
        <div className={styles['seance-tab-header']}>
          <h1>Gestion des Séances</h1>
          <button className={styles['btn-primary']} onClick={() => { setIsAddingSeance(true); getGroupe() }}>
            Programmer une séance
          </button>
        </div>

        <div className={styles['stats']}>
          <StatCard
            title="Séance programmer"
            value={seances.length}
            icon={Calendar}
            description="Séance programmer pour la semaine en cours"
          />
          <StatCard
            title="Séance Faite"
            value={seances.filter(s => s.statutSeance === 1).length}
            icon={CalendarCheck2}
            description="Séance Faite pendant la semaine en cours"
          />
          <StatCard
            title="Séance Annuler"
            value={seances.filter(s => s.statutSeance === 2).length}
            icon={CalendarX2}
            description="Séance annuler pendant la semaine en cours"
          />

        </div>

        <div className={styles['tabs']}>
          <button
            className={`${styles['tab']} ${activeTab === 'emploi-du-temps' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('emploi-du-temps')}
          >
            Emploi du temps
          </button>
          <button
            className={`${styles['tab']} ${activeTab === 'historique' ? styles['active'] : ''}`}
            onClick={() => {
              setActiveTab('historique');
              getHistorique();
            }}
          >
            Historique
          </button>
          <button
            className={`${styles['tab']} ${activeTab === 'absences' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('absences')}
          >
            Absences
          </button>
        </div>

        {activeTab === 'emploi-du-temps' && (
          <div className={styles['emploi-du-temps']}>
            <div className={styles["timetable-swip"]}>
              <button className={styles['btn-secondary']} onClick={handlePreviousWeek}>Semaine précedente</button>
              <h2>{formatDate(currentWeek.begin) + ' - ' + formatDate(currentWeek.end)}</h2>
              <button className={styles['btn-secondary']} onClick={handleNextWeek}>Semaine suivante</button>
            </div>
            <div className={styles['timetable']}>
              <div className={styles['timetable-header']}>
                <div></div>
                {jours.map(jour => (
                  <div key={jour} className={styles['jour']}>{jour}</div>
                ))}
              </div>
              {heures.map(heure => (
                <div key={heure} className={styles['timetable-row']}>
                  <div className={styles['heure']}>{heure}</div>
                  {jours.map(jour => {
                    const seance = seances.find(s => {
                      const seanceJour = getDateTimePart(s.dateSeance, 'jour');
                      const seanceHeure = getDateTimePart(s.dateSeance, 'heure');
                      return seanceJour === jour && seanceHeure === heure;
                    });

                    return (
                      <div
                        key={`${jour}-${heure}`}
                        className={`${styles['seance']} ${seance ? getSeanceStyle(seance) : ''}`}
                        onClick={() => seance && handleSeanceClick(seance)}
                      >
                        {seance && (
                          <div>
                            <p className={styles['groupe']}>{seance.nomGroupe}</p>
                            {seance.typeSeance === 1 && (
                              <p className={styles['type']}>Exceptionnel</p>
                            )}
                            {seance.statutSeance === 2 && (
                              <p className={styles['status']}>Annulée</p>
                            )}
                            {seance.statutSeance === 1 && (
                              <p className={styles['status']}>Terminé</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'historique' && (
          <div className={styles['historique']}>
            <h2 className={styles['historique-title']}>Historique des séances</h2>

            <div className={styles['search-bar']}>
              <div className={styles['search-input']}>
               
                <input
                  type="date"
                  placeholder="Rechercher par date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className={styles['date-input']}
                />
              </div>

              <div className={styles['search-input']}>
                <select
                  value={searchGroup}
                  onChange={(e) => setSearchGroup(e.target.value)}
                  className={styles['group-select']}
                >
                  <option value="">Tous les groupes</option>
                  {groupes.map(groupe => (
                    <option key={groupe.idGroupe} value={groupe.nomGroupe}>{groupe.nomGroupe}</option>
                  ))}
                </select>
              </div>
            </div>

            {historique.length === 0 ? (
              <p>Aucune séance enregistrée dans l'historique.</p>
            ) : (
              <div className={styles["table-container"]}>
                <table className={styles['table-historique']}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Jour</th>
                      <th>Heure</th>
                      <th>Groupe</th>
                      <th>Présents</th>
                      <th>Absents</th>
                      <th>Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistorique.map((seance, index) => (
                      <tr key={index}>
                        <td>{seance.dateSeance.split(' ')[0]}</td>
                        <td>{getDateTimePart(seance.dateSeance, 'jour')}</td>
                        <td>{getDateTimePart(seance.dateSeance, 'heure')}</td>
                        <td>{seance.nomGroupe}</td>
                        <td>{seance.totalPresents}</td>
                        <td>{seance.totalAbsents}</td>
                        <td>
                          <button className={styles['btn-secondary']} onClick={() => getHistoriqueDetails(seance)}>
                            Voir détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'absences' && (
          <div className={styles['historique']}>
            <h2 className={styles['historique-title']}>Liste des absences</h2>

            <div className={styles['search-bar']}>
              <div className={styles['search-input']}>
                <Search className={styles['search-icon']} />
                <input
                  type="text"
                  placeholder="Rechercher un étudiant"
                  value={searchAbsence}
                  onChange={(e) => setSearchAbsence(e.target.value)}
                  className={styles['group-input']}
                />
              </div>
              <div className={styles['search-input']}>
                <select
                  value={filterGroupAbsence}
                  onChange={(e) => setFilterGroupAbsence(e.target.value)}
                  className={styles['group-select']}
                >
                  <option value="">Tous les groupes</option>
                  {groupes.map(groupe => (
                    <option key={groupe.idGroupe} value={groupe.nomGroupe}>{groupe.nomGroupe}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredAbsences.length === 0 ? (
              <p>Aucune absence enregistrée.</p>
            ) : (
              <div className={styles["table-container"]}>
                <table className={styles['table-absences']}>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Groupe</th>
                      <th>Nombre d'absences</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAbsences.map((absence, index) => (
                      <tr key={index}>
                        <td>{absence.nomEleve}</td>
                        <td>{absence.nomGroupe}</td>
                        <td>{absence.nombreAbsences}</td>
                        <td>
                          <button className={styles['btn-secondary']} onClick={() => getAbsenceDetails(absence)}>
                            Voir détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {selectedSeance && selectedSeance.statutSeance !== 1 ? (
        <div className={styles['modal']}>
          <div className={styles['modal-content'] + ' ' + styles['modal-selected-seance']} ref={modalRef}>
            <span className={styles.close} onClick={() => setSelectedSeance(null)}>&times;</span>
            <h2 style={{ textAlign: 'center' }}>Gérer la séance</h2>
            <div className={styles['seance-details']}>
              <h3>Détails de la séance</h3>
              <p><strong>Jour:</strong><span className={styles['value']}> {getDateTimePart(selectedSeance.dateSeance, 'jour')}</span></p>
              <p><strong>Heure:</strong><span className={styles['value']}> {getDateTimePart(selectedSeance.dateSeance, 'heure')}</span></p>
              <p><strong>Groupe:</strong><span className={styles['value']}> {selectedSeance.nomGroupe}</span></p>
              <p><strong>Type:</strong><span className={styles['value']}> {selectedSeance.typeSeance === 0 ? 'Hebdomadaire' : 'Exceptionnel'}</span></p>
              <p><strong>Statut:</strong><span className={styles['value']}> {selectedSeance.statutSeance === 0 ? 'Seance non faite' :
                (selectedSeance.statutSeance === 1 ? 'Seance faite' : 'Seance annulé')}
              </span></p>
            </div>

            <div className={styles['modal-actions']}>
              {selectedSeance.statutSeance === 0 &&
                <>
                  <button className={styles['btn-primary']} onClick={handleRecordPresence}>
                    Valider la séance et marquer les présences
                  </button>
                  <button className={styles['btn-secondary']} onClick={handleCancelSeance}>
                    Annuler la séance pour cette semaine
                  </button>
                </>
              }
              <button className={styles['btn-danger']} onClick={handleDeleteSeance}>
                Supprimer la séance de l'emploie du temp
              </button>
            </div>

          </div>
        </div>
      ) : (selectedSeance && !selectedHistorySeance ? getHistoriqueDetails(selectedSeance) : null)}

      {isRecordingPresence && (
        <div className={styles['modal']}>
          <div className={styles['modal-content']} ref={modalRef}>
            <h2 style={{ textAlign: 'center' }}>Enregistrer les présences</h2>
            <div className={styles["prix-seance"]}>
              <span htmlFor="">Prix de la seance :</span>
              <input type="number"
                value={currentTarif}
                onChange={(e) => {
                  setCurrentTarif(e.target.value)
                }}
                required
              />
            </div>
            <span>Selectionner les presences :</span>
            <ul className={styles['studentList']}>
              {etudiants.filter(etudiant => etudiant.idGroupe === selectedSeance.idGroupe).map(etudiant => (
                <li key={etudiant.idEleve} className={styles['studentItem']}>
                  <input
                    type="checkbox"
                    id={`etudiant-${etudiant.idEleve}`}
                    checked={presentEtudiants.includes(etudiant.idEleve)}
                    onChange={() => toggleEtudiantPresence(etudiant.idEleve)}
                  />
                  <label htmlFor={`etudiant-${etudiant.idEleve}`}>{etudiant.nomComplet}</label>
                </li>
              ))}
            </ul>
            <div className={styles['modal-actions']}>
              <button className={styles['btn-secondary']} onClick={() => setIsRecordingPresence(false)}>Annuler</button>
              <button className={styles['btn-primary']} onClick={savePresence}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}


      {selectedHistorySeance && (
        <div className={styles['modal']}>
          <div className={styles['modal-content']} ref={modalRef}>
            <h2 style={{ textAlign: 'center' }}>Détails de la séance</h2>
            <div className={styles['seance-details']}>
              <h3>Informations générales</h3>
              <p><strong>Date:</strong> {selectedHistorySeance.dateSeance.split(' ')[0]}</p>
              <p><strong>Jour:</strong> {getDateTimePart(selectedHistorySeance.dateSeance, 'jour')}</p>
              <p><strong>Heure:</strong> {getDateTimePart(selectedHistorySeance.dateSeance, 'heure')}</p>
              <p><strong>Groupe:</strong> {selectedHistorySeance.nomGroupe}</p>
              <p><strong>Prix:</strong> {selectedHistorySeance.prixSeance} da</p>
              <p><strong>Type:</strong> {selectedHistorySeance.typeSeance === 0 ? 'Hebdomadaire' : 'Exceptionnel'}</p>
            </div>
            <div className={styles['presence-list']}>
              <h3 className={`${styles['label-list']}`}>
                {presentStatus === true ?
                  `Liste des présents (${selectedHistorySeance.presentEtudiants.length})`
                  :
                  `Liste des absents (${selectedHistorySeance.absentEtudiants.length})`
                }
              </h3>
              <button
                className={`${styles['btn-secondary']} ${styles['btn-status']}`}
                onClick={() => setPresentStatus(!presentStatus)}
              >{presentStatus === true ?
                `Afficher les absents (${selectedHistorySeance.absentEtudiants.length})`
                :
                `Afficher les presents (${selectedHistorySeance.presentEtudiants.length})`
                }
              </button>
              <ul>
                {presentStatus === true ?
                  selectedHistorySeance.presentEtudiants.map((etudiant, index) => (
                    <li key={index}>{etudiant}</li>
                  ))
                  :
                  selectedHistorySeance.absentEtudiants.map((etudiant, index) => (
                    <li key={index}>{etudiant}</li>
                  ))}
              </ul>
            </div>
            <button className={styles['btn-secondary']} onClick={() => {
              setSelectedSeance(null);
              setSelectedHistorySeance(null);
            }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {isAddingSeance && (
        <div className={styles['modal']}>
          <div className={styles['modal-content']} ref={modalRef}>
            <h2>Programmer une nouvelle séance</h2>
            <div className={styles['form-group']}>
              <label htmlFor="new-jour">Jour</label>
              <select
                id="new-jour"
                value={newSeance.jour}
                onChange={(e) => setNewSeance(prev => ({ ...prev, jour: e.target.value }))}
              >
                <option value="">Sélectionner un jour</option>
                {jours.map((jour, index) => (
                  <option key={jour} value={index}>{jour}</option>
                ))}
              </select>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="new-heure">Heure</label>
              <select
                id="new-heure"
                value={newSeance.heure}
                onChange={(e) => setNewSeance(prev => ({ ...prev, heure: e.target.value }))}
              >
                <option value="">Sélectionner une heure</option>
                {heures.map(heure => (
                  <option key={heure} value={heure}>{heure}</option>
                ))}
              </select>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="new-groupe">Groupe</label>
              <select
                id="new-groupe"
                value={newSeance.idGroupe}
                onChange={(e) => setNewSeance(prev => ({ ...prev, idGroupe: e.target.value }))}
              >
                <option value="">Sélectionner un groupe</option>
                {groupesName.map(groupe => (
                  <option key={groupe.idGroupe} value={groupe.idGroupe}>{groupe.nomGroupe}</option>
                ))}
              </select>
            </div>
            
            <div className={styles['form-group']}>
              <label htmlFor="new-type">Type de séance</label>
              <div className={styles['type-and-date']}>
                <select
                  id="new-type"
                  value={newSeance.typeSeance}
                  onChange={(e) => setNewSeance(prev => ({ ...prev, typeSeance: e.target.value }))}
                >
                  <option value={0}>Séance pour chaque semaine</option>
                  <option value={1}>Séance pour cette semaine seulement</option>
                </select>
                {newSeance.typeSeance == 0 && (
                  <input
                    type="date"
                    id="end-date"
                    value={newSeance.endDate}
                    onChange={(e) => setNewSeance(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                )}
              </div>
            </div>
            <div className={styles['modal-actions']}>
              <button className={styles['btn-primary']} onClick={handleAddSeance}>Ajouter la séance</button>
              <button className={styles['btn-secondary']} onClick={() => setIsAddingSeance(false)}>Annuler</button>

            </div>
          </div>
        </div>
      )}

      {selectedAbsenceUser && (
        <div className={styles['modal']}>
          <div className={styles['modal-content']} ref={modalRef}>
            <h2 style={{ textAlign: 'center' }}>Détails des absences</h2>
            <div className={styles['seance-details']}>
              <h3>Informations générales</h3>
              <p><strong>Nom:</strong> {selectedAbsenceUser.nomEleve}</p>
              <p><strong>Prénom:</strong> {selectedAbsenceUser.prenomEleve}</p>
              <p><strong>Groupe:</strong> {selectedAbsenceUser.nomGroupe}</p>
            </div>
            <div className={styles['absences-list']}>
              <h3>Liste des séances manquées ({selectedAbsenceUser.nombreAbsences})</h3>
              <div className={styles['absences-table-container']}>
                <table className={styles['absences-table']}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Heure</th>
                      <th>Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAbsenceUser.absences.map((absence, index) => (
                      <tr key={index}>
                        <td>{new Date(absence.dateSeance).toLocaleDateString('fr-FR')}</td>
                        <td>{new Date(absence.dateSeance).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{absence.prixSeance} da</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <button className={styles['btn-secondary']} onClick={() => setSelectedAbsenceUser(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`${styles['message']} ${styles[message.type]}`}>
          {message.text}
          <span className={styles['close-message']} onClick={() => setMessage(null)}>&times;</span>
        </div>
      )}


    </div>
  )
}

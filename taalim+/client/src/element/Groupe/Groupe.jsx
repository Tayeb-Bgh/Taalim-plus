import React, { useState } from 'react';
import { useEffect } from 'react';
import styles from './Groupe.module.css'
import StatCard from '../Utils/StatCard';
import { User, Users } from 'lucide-react';


const Groupe = () => {
  const [groupes, setGroupes] = useState([]);

  const [reRenderData, setReRenderData] = useState(true);
  useEffect(() => {
    const fetchGroupes = async () => {
      try {
        // Premier fetch pour les groupes avec étudiants
        const resGroupes = await fetch('http://localhost:5000/groupe');
        const dataGroupes = await resGroupes.json();

        // Deuxième fetch pour les groupes sans étudiants
        const resGroupesSansEtudiants = await fetch('http://localhost:5000/groupe/sans-etudiants');
        const dataGroupesSansEtudiants = await resGroupesSansEtudiants.json();
        console.log(dataGroupesSansEtudiants);

        // Traitement des groupes avec étudiants
        const groupesAvecEtudiants = dataGroupes.reduce((acc, current) => {
          const groupId = current.idGroupe;

          let group = acc.find(g => g.idGroupe === groupId);

          if (!group) {
            group = {
              idGroupe: current.idGroupe,
              nomGroupe: current.nomGroupe,
              typeGroupe: current.typeGroupe,
              tarifGroupe: current.tarifGroupe,
              elevesGroupe: [],
            };
            acc.push(group);
          }

          if (current.idEleve) {
            group.elevesGroupe.push({
              idEleve: current.idEleve,
              nomComplet: `${current.nomEleve} ${current.prenomEleve}`,
            });
          }

          return acc;
        }, []);

        // Traitement des groupes sans étudiants
        const groupesSansEtudiants = dataGroupesSansEtudiants.map(groupe => ({
          idGroupe: groupe.idGroupe,
          nomGroupe: groupe.nomGroupe,
          typeGroupe: groupe.typeGroupe,
          tarifGroupe: groupe.tarifGroupe,
          elevesGroupe: [], 
        }));

        // Fusionner les deux listes
        setGroupes([...groupesAvecEtudiants, ...groupesSansEtudiants]);
      } catch (err) {
        console.error('Erreur lors de la récupération des groupes:', err);
      }
    };

    fetchGroupes();
  }, [reRenderData]);

  // Nouvelle méthode pour supprimer un groupe
  function supprimerGroupe(idGroupe) {
    fetch(`http://localhost:5000/groupe/${idGroupe}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          setReRenderData(!reRenderData);
        }
      })
      .catch(err => console.error('Erreur lors de la suppression du groupe:', err));
  }

  const [filter, setFilter] = useState('all');

  const handleFilterChange = (filterType) => {
    setFilter(filterType);
  };

  const filteredGroupes = groupes.filter(groupe => {
    if (filter === 'collectif') return groupe.typeGroupe === 0;
    if (filter === 'individuel') return groupe.typeGroupe === 1;
    return true;
  });

  const [searchTerm, setSearchTerm] = useState('');

  const [showModalAddGroupe, setShowModalAddGroupe] = useState(false);

  function openModalAddGroupe() {
    setShowModalAddGroupe(true);
  }

  function closeModalAddGroupe() {
    setShowModalAddGroupe(false);
  }

  const [currentGroupe, setCurrentGroupe] = useState();
  const [showModalModifyGroupe, setShowModalModifyGroupe] = useState(false);

  function openModalModifyGroupe(groupe) {
    setCurrentGroupe(groupe);
    setShowModalModifyGroupe(true);
  }

  function closeModalModifyGroupe() {
    setCurrentGroupe();
    setShowModalModifyGroupe(false);
  }

  function retirerEleve(idEleve) {
    fetch(`http://localhost:5000/groupe/etudiant/retirer/${idEleve}`, { method: 'PATCH' })
      .then(res => {
        console.log(res)
        closeModalModifyGroupe();
        setReRenderData(!reRenderData);
      });
  }

  function ajouterEleves() {
    console.log(selectedStudent, currentGroupe.idGroupe)
    fetch(`http://localhost:5000/groupe/etudiant/ajouter`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'selectedStudent': selectedStudent,
          'idGroupe': currentGroupe.idGroupe
        })
      })
      .then(res => {
        console.log(res)
        closeModalModifyGroupe();
        setReRenderData(!reRenderData);
      });
  }

  const [studentsWithoutGroup, setStudentsWithoutGroup] = useState([]);

  function getStudentWithoutGroup() {
    fetch('http://localhost:5000/etudiant/nom')
      .then(res => res.json())
      .then(data => {
        let tempTab = [];
        data.forEach(element => {
          tempTab = [...tempTab,
          {
            'idEleve': element.idEleve,
            'nomComplet': `${element.nomEleve} ${element.prenomEleve}`
          }
          ]
        });
        setStudentsWithoutGroup(tempTab);
      })
  }

  const [selectedStudent, setSelectedStudent] = useState([]);
  const [currentType, setCurrentType] = useState(1);

  function setGroupeType(e) {
    setCurrentType(e.target.value);
    setSelectedStudent([])
  }

  function handleStudentSelect(e) {
    const idStd = e.target.value;

    if (currentType === 1) {
      if (e.target.checked) {
        setSelectedStudent([idStd]); // Remplace la sélection avec une seule personne
      } else {
        setSelectedStudent([]); // Si décoché, on vide la sélection
      }
    } else if (currentType === 0) {
      if (e.target.checked) {
        setSelectedStudent([...selectedStudent, idStd]);
      } else {
        setSelectedStudent(selectedStudent.filter(id => id !== idStd)); // Retire la personne
      }
    }
  }



  function createGroupe(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      ...Object.fromEntries(formData.entries()),
      'selectedStudent': selectedStudent
    };

    console.log('data encoyé : ' + data)
    fetch('http://localhost:5000/groupe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(res => {
        setReRenderData(!reRenderData);
        closeModalAddGroupe();
      })


  }

  /*----------------------------------------------------------------*/

  // Fonction pour gérer les changements dans les cases à cocher
  const handleSelectionChange = (e, idEleve) => {
    if (e.target.checked) {
      setSelectedStudent([...selectedStudent, idEleve.toString()]);
    } else {
      setSelectedStudent(selectedStudent.filter(id => id !== idEleve.toString()));
    }
  };


  const [showAddSection, setShowAddSection] = useState(false);

  /* // Fonction pour basculer l'affichage
  const toggleAddSection = () => {
    setShowAddSection(!showAddSection);
  }; */


  return (
    <div className={styles['groupe-container']}>
      <div className={styles.entete}>
        <h1>Liste des Groupes</h1>
        <button className={styles['add-group-btn']}
          onClick={() => {
            openModalAddGroupe();
            getStudentWithoutGroup();
          }
          }>Ajouter un groupe</button>
      </div>

      {showModalAddGroupe && (
        <div className={styles['modal-overlay']} /* onClick={closeModal} */>
          <div className={styles['modal-content']} /* onClick={(e) => e.stopPropagation()} */>
            <h2>Ajouter un groupe</h2>
            <form onSubmit={(e) => createGroupe(e)}>
              <div className={styles['form-group']}>
                <label htmlFor="nomGroupe">Nom du groupe</label>
                <input type="text" id="nomGroupe" name="nomGroupe" required />
              </div>

              <div className={styles['form-group']}>
                <label htmlFor="tarifGroupe">Tarif du groupe</label>
                <input type="number" id="tarifGroupe" name="tarifGroupe" required />
              </div>

              <div className={styles['form-group']}>
                <label htmlFor="typeGroupe">Type de groupe</label>
                <select id="typeGroupe" name="typeGroupe" onChange={(e) => setGroupeType(e)} required>
                  <option value={1}>Individuel</option>
                  <option value={0}>Collectif</option>
                </select>
              </div>

              <div className={styles['form-group']}>
                <label onClick={() => console.log(selectedStudent)}>Ajouter des étudiants sans groupe</label>
                <div className={styles['students-list']}>
                  {studentsWithoutGroup.map((student) => (
                    <div key={student.idEleve}>
                      <input
                        type="checkbox"
                        id={`student-${student.idEleve}`}
                        value={student.idEleve}
                        onChange={handleStudentSelect}
                        checked={selectedStudent.includes(student.idEleve.toString())}
                      />
                      <label htmlFor={`student-${student.idEleve}`}>{student.nomComplet}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles['modal-actions']}>
                <button type="submit"
                  className={styles['submit-button']}
                >
                  Créer le groupe
                </button>
                <button type="button"
                  className={styles['cancel-button']}
                  onClick={() => {
                    closeModalAddGroupe();
                    setSelectedStudent([]);
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <br />
      <div className={styles.stats}>
        <StatCard
          title="Total de groupe"
          value={groupes.length}
          icon={Users}
          description="Total de groupe collectif et individuel"
        />
        <StatCard
          title="Groupe Collectif"
          value={groupes.filter(g => g.typeGroupe === 0).length}
          icon={Users}
          description="Groupe constituer de plus de 7 personne"
        />
        <StatCard
          title="Groupe Individuel"
          value={groupes.filter(g => g.typeGroupe === 1).length}
          icon={User}
          description="Groupe constituer d'une personne seulement"
        />
      </div>

      <div className={styles['filter-tabs']}>
        <button className={`${styles['filter-tab']} ${filter === 'all' ? styles.active : ''}`} onClick={() => handleFilterChange('all')}>Tout</button>
        <button className={`${styles['filter-tab']} ${filter === 'collectif' ? styles.active : ''}`} onClick={() => handleFilterChange('collectif')}>Collectifs</button>
        <button className={`${styles['filter-tab']} ${filter === 'individuel' ? styles.active : ''}`} onClick={() => handleFilterChange('individuel')}>Individuels</button>
      </div>

      <div className={styles['groupes-component']}>
        <div className={styles['groupes-list']}>
          {filteredGroupes.map((groupe) => (
            <div
              key={groupe.idGroupe}
              className={styles['groupe-card']}
              onClick={() => openModalModifyGroupe(groupe)}
            >
              <h2 className={styles['title-groupe']}>{groupe.nomGroupe}</h2>
              <div className={styles['groupe-info']}>
                <p><strong>Type:</strong> {groupe.typeGroupe === 0 ? 'Collectif' : 'Individuel'}</p>
                <p><strong>Tarif:</strong> {groupe.tarifGroupe} da</p>
              </div>
              <div className={styles['groupe-eleves']}>
                <p><strong>Listes des élèves:</strong></p>
                <p className={styles['eleves-count']}>{groupe.elevesGroupe.length} élève(s)</p>
              </div>
              <ul>
                {groupe.elevesGroupe.slice(0, 2).map((eleve, index) => (
                  <li key={index}>{eleve.nomComplet}</li>
                ))}
                {groupe.elevesGroupe.length > 2 && (
                  <li className={styles['more-dots']}>+ {groupe.elevesGroupe.length - 2} autres</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {showModalModifyGroupe && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <span
              className={styles.close}
              onClick={() => {
                closeModalModifyGroupe();
                setSelectedStudent([]);
                setShowAddSection(false);
              }}
            >
              &times;
            </span>

            {!showAddSection ? (
              <>
                <h2 className={styles.modalTitle}>{currentGroupe.nomGroupe}</h2>

                <div className={styles.groupInfo}>
                  <div>
                    <span>Type</span>
                    <span className={styles.infoValue}>{currentGroupe.typeGroupe === 0 ? 'Collectif' : 'Individuel'}</span>
                  </div>
                  <div>
                    <span>Tarif</span>
                    <span className={styles.infoValue}>{currentGroupe.tarifGroupe} da</span>
                  </div>
                </div>

                <div className={styles['headerListEleve']}>
                  <h3>Liste des élèves:</h3>
                  <p className={styles['eleves-count']}>{currentGroupe.elevesGroupe.length} élève(s)</p>
                </div>

                <ul className={styles.studentList}>
                  {currentGroupe.elevesGroupe.map((eleve) => (
                    <li key={eleve.idEleve} className={styles.studentItem}>
                      <span>{eleve.nomComplet}</span>
                      <button
                        className={styles.removeButton}
                        onClick={() => retirerEleve(eleve.idEleve)}
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>

                {currentGroupe.elevesGroupe.length === 0 && (
                  <button
                    className={styles['delete-button']}
                    onClick={() => supprimerGroupe(currentGroupe.idGroupe)}
                  >
                    Supprimer le groupe
                  </button>
                )}

                <button
                  onClick={() => setShowAddSection(true)}
                  className={styles["btn-primary"]}
                >
                  Ajouter des élèves au groupe
                </button>
              </>
            ) : (
              <div className={styles['add-users-parts']}>
                <h2 className={styles.modalTitle}>Ajouter des élèves</h2>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="Rechercher des élèves..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <ul className={styles.studentList}>
                  {studentsWithoutGroup.length > 0 ? studentsWithoutGroup
                    .filter((eleve) =>
                      eleve.nomComplet.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((eleve) => (

                      <li htmlFor={'checkboxAddUser'} key={eleve.idEleve} className={styles.studentItem}>
                        <label htmlFor={`checkbox-${eleve.idEleve}`}>
                          <input
                            id={`checkbox-${eleve.idEleve}`}
                            type="checkbox"
                            value={eleve.idEleve}
                            onChange={(e) => handleSelectionChange(e, eleve.idEleve)}
                            checked={selectedStudent.includes(eleve.idEleve.toString())}
                          />
                          {eleve.nomComplet}
                        </label>
                      </li>

                    ))
                    : (
                      <p>Aucun élève sans groupe disponible.</p>
                    )}
                </ul>
                <div className={styles["modal-actions"]}>
                  <button
                    className={`${styles['submit-button']} ${selectedStudent.length === 0 ? styles.disabled : ''
                      }`}
                    onClick={ajouterEleves}
                    disabled={selectedStudent.length === 0}
                  >
                    Ajouter ({selectedStudent.length})
                  </button>
                  <button
                    className={styles['cancel-button']}
                    onClick={() => {
                      setShowAddSection(false);
                      setSelectedStudent([]);
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>

  );
};

export default Groupe;

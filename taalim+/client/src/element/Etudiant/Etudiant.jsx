import React, { useState, useEffect } from "react";
import styles from "./Etudiant.module.css";
import { Users, UsersRound, User, Star, Trash2, Edit } from 'lucide-react';
import StatCard from '../Utils/StatCard';

const Etudiant = () => {
  const [usersData, setUsersData] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchType, setSearchType] = useState("prenom");
  const [reRenderData, setReRenderData] = useState(true);
  const [groupeInfo, setGroupeInfo] = useState([]);
  const [showModalAddUser, setShowModalAddUser] = useState(false);
  const [showModalModifyUser, setShowModalModifyUser] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/etudiant')
      .then(res => res.json())
      .then(data => {
        console.log(data)
        setUsers(data);
        setUsersData(data);
      })
      .catch(err => console.error(err));
  }, [reRenderData]);

  useEffect(() => {
    fetch('http://localhost:5000/groupe/nom')
      .then(res => res.json())
      .then(data => {
        setGroupeInfo(data);
      })
  }, []);

  const handleSearch = (searchQuery) => {
    if (searchType === "prenom") {
      setUsers(usersData.filter(user => user.prenomEleve.toLowerCase().includes(searchQuery.toLowerCase())));
    } else if (searchType === "nom") {
      setUsers(usersData.filter(user => user.nomEleve.toLowerCase().includes(searchQuery.toLowerCase())));
    } else if (searchType === "numero") {
      setUsers(usersData.filter(user => user.numeroTel.toString().includes(searchQuery)));
    } else if (searchType === "groupe") {
      if (searchQuery.toLowerCase() === "aucun")
        setUsers(usersData.filter(user => user.idGroupe === null));
      else
        setUsers(usersData.filter(user => user.idGroupe === Number(searchQuery)));
    }

    if (!searchQuery)
      setUsers(usersData);
  };

  const handleDelete = (id) => {
    setUserToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    fetch(`http://localhost:5000/etudiant/${userToDelete}`, { method: 'DELETE' })
      .then((response) => {
        if (response.ok) {
          setReRenderData(!reRenderData);
          showToastMessage("Étudiant supprimé avec succès");
        } else {
          showToastMessage("Erreur lors de la suppression de l'étudiant");
        }
      })
      .catch((error) => {
        console.log(error);
        showToastMessage("Erreur lors de la suppression de l'étudiant");
      })
      .finally(() => {
        setShowDeleteConfirm(false);
        setUserToDelete(null);
      });
  };

  const openModalAddUser = () => {
    setShowModalAddUser(true);
  };

  const closeModalAddUser = () => {
    setShowModalAddUser(false);
  };

  const openModalModifyUser = (user) => {
    setShowModalModifyUser(true);
    setCurrentUser(user);
  };

  const closeModalModifyUser = () => {
    setShowModalModifyUser(false);
    setCurrentUser(null);
  };

  function sendPostRequest(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    fetch(`http://localhost:5000/etudiant/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(res => {
        if (res.ok) {
          setReRenderData(!reRenderData);
          closeModalAddUser();
          showToastMessage("Étudiant ajouté avec succès");
        } else {
          showToastMessage("Erreur lors de l'ajout de l'étudiant");
        }
      })
      .catch(error => {
        console.log(error);
        showToastMessage("Erreur lors de l'ajout de l'étudiant");
      });
  }

  function sendPutRequest(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    fetch(`http://localhost:5000/etudiant/${currentUser.idEleve}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then((response) => {
        if (response.ok) {
          setReRenderData(!reRenderData);
          closeModalModifyUser();
          showToastMessage("Informations de l'étudiant modifiées avec succès");
        } else {
          showToastMessage("Erreur lors de la modification des informations de l'étudiant");
        }
      })
      .catch((error) => {
        console.log(error);
        showToastMessage("Erreur lors de la modification des informations de l'étudiant");
      });
  }

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  function countUsersNotAloneInGroup(users) {
    // Création d'un objet pour compter le nombre d'étudiants par groupe
    const groupCounts = {};

    // Première itération pour compter les étudiants dans chaque groupe
    users.forEach(user => {
        const groupName = user.nomGroupe;
        if (groupName) {
            if (groupCounts[groupName]) {
                groupCounts[groupName]++;
            } else {
                groupCounts[groupName] = 1;
            }
        }
    });

    // Deuxième itération pour compter les étudiants qui ne sont pas seuls
    let count = 0;
    users.forEach(user => {
        const groupName = user.nomGroupe;
        if (groupName && groupCounts[groupName] > 1) {
            count++;
        }
    });

    return count;
  }

  function countStudentsAloneInGroup(users) {
    const groupCounts = {};

    // Compter le nombre d'étudiants dans chaque groupe
    users.forEach(user => {
        const groupName = user.nomGroupe;
        if (groupName) { // Exclure les étudiants sans groupe
            if (groupCounts[groupName]) {
                groupCounts[groupName]++;
            } else {
                groupCounts[groupName] = 1;
            }
        }
    });

    // Compter le nombre d'étudiants qui sont seuls dans leur groupe
    let count = 0;
    users.forEach(user => {
        const groupName = user.nomGroupe;
        if (groupName && groupCounts[groupName] === 1) {
            count++;
        }
    });

    return count;
  }


  return (
    <div className={styles['user-management']}>
      <div className={styles.header}>
        <h1>Liste des Etudiants</h1>
      </div>

      <div className={styles.stats}>
        <StatCard
          title="Total d'étudiant"
          value={users.length}
          icon={Users}
          description="Total de tout les étudiant"
        />
        <StatCard
          title="Étudiants en groupe collectif"
          value={countUsersNotAloneInGroup(users)}
          icon={UsersRound}
          description="Étudiants dans des groupes de plus de 7 personne"
        />
        <StatCard
          title="Étudiants en groupe Individuel"
          value={countStudentsAloneInGroup(users)}
          icon={User}
          description="Étudiants dans des groupes constituer d'une personne"
        />
      </div>

      <div className={styles['main-content']}>
        <div className={styles['search-Bar']}>
          <input
            type="text"
            placeholder={`Rechercher par ${searchType}`}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles['input-search']}
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className={styles['select-type-search']}
          >
            <option value="prenom">Prénom</option>
            <option value="nom">Nom</option>
            <option value="numero">Numéro de téléphone</option>
            <option value="groupe">Groupe</option>
          </select>

          <button className={styles['add-user-btn']} onClick={openModalAddUser}>Ajouter un étudiant</button>
        </div>
        <div className={styles["table-container"]}>
          <table className={styles['user-table']}>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Année</th>
                <th>Téléphone</th>
                <th>Groupe</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.idEleve}>
                  <td>
                    {user.nomEleve}
                    {user.tarifSpecial && (
                      <Star className={styles['tarif-special-icon']} size={16} />
                    )}
                  </td>
                  <td>{user.prenomEleve}</td>
                  <td>{user.anneeEleve}</td>
                  <td>{user.numeroTel}</td>
                  <td>
                    <span className={`${styles['role-badge']} ${user.nomGroupe === null ? styles.admin : styles.coordinator}`}>
                      {user.nomGroupe ? user.nomGroupe : "Aucun"}
                    </span>
                  </td>
                  <td>
                    <button className={`${styles['action-btn']} ${styles.edit}`} onClick={() => openModalModifyUser(user)}>{<Edit />}</button>
                    <button className={`${styles['action-btn']} ${styles.delete}`} onClick={() => handleDelete(user.idEleve)}>{<Trash2 />}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModalAddUser && (
        <div className={styles['modal']}>
          <div className={styles['modal-content']}>
            <span className={styles.close} onClick={closeModalAddUser}>&times;</span>
            <h2>Ajouter un étudiant</h2>
            <form className={styles['form-ajout-etudiant']} onSubmit={(e) => sendPostRequest(e)}>
              <div className={styles['form-group']}>
                <label>Nom:</label>
                <input type="text" name="nom" className={styles['form-control']} required />
              </div>
              <div className={styles['form-group']}>
                <label>Prénom:</label>
                <input type="text" name="prenom" className={styles['form-control']} required />
              </div>
              <div className={styles['form-group']}>
                <label>Année:</label>
                <input type="number" name="annee" className={styles['form-control']} required />
              </div>
              <div className={styles['form-group']}>
                <label>Téléphone:</label>
                <input type="number" name="telephone" className={styles['form-control']} />
              </div>
              <div className={styles['form-group']}>
                <label>Tarif Spécial:</label>
                <input type="number" name="tarifSpecial" className={styles['form-control']} />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="idGroupe">Groupe:</label>
                <select id="idGroupe" name="idGroupe" className={styles['form-control']} >
                  <option key={99999} value="">Aucun</option>
                  {groupeInfo.map(groupe => (
                    <option key={groupe.idGroupe} value={groupe.idGroupe}>{groupe.nomGroupe}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className={styles['btn-ajouter']}>Ajouter</button>
            </form>
          </div>
        </div>
      )}

      {showModalModifyUser && (
        <section className={styles.modal}>
          <div className={styles['modal-content']}>
            <span className={styles.close} onClick={closeModalModifyUser}>&times;</span>
            <h2>Modifier les informations</h2>
            <form className={styles['form-modifier-etudiant']} onSubmit={(e) => sendPutRequest(e)}>
              <div className={styles['form-group']}>
                <label>Nom:</label>
                <input type="text" name="nom" className={styles['form-control']} defaultValue={currentUser.nomEleve} required />
              </div>
              <div className={styles['form-group']}>
                <label>Prénom:</label>
                <input type="text" name="prenom" className={styles['form-control']} defaultValue={currentUser.prenomEleve} required />
              </div>
              <div className={styles['form-group']}>
                <label>Année:</label>
                <input type="number" name="annee" className={styles['form-control']} defaultValue={currentUser.anneeEleve} required />
              </div>
              <div className={styles['form-group']}>
                <label>Téléphone:</label>
                <input type="number" name="telephone" className={styles['form-control']} defaultValue={currentUser.numeroTel} />
              </div>
              <div className={styles['form-group']}>
                <label>Tarif spécial:</label>
                <input type="number" name="tarifSpecial" className={styles['form-control']} defaultValue={currentUser.tarifSpecial} />
              </div>
              <div className={styles['form-group']}>
                <label>Groupe:</label>
                <select id="idGroupe"
                  name="idGroupe"
                  className={styles['form-control']}
                  defaultValue={currentUser.idGroupe}
                >
                  <option key={99999} value="">Aucun</option>
                  {groupeInfo.map(groupe => (
                    <option key={groupe.idGroupe} value={groupe.idGroupe}>{groupe.nomGroupe}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className={styles['btn-ajouter']}>Modifier</button>
            </form>
          </div>
        </section>
      )}

      {showToast && (
        <div className={styles.toast}>
          {toastMessage}
        </div>
      )}

      {showDeleteConfirm && (
        <div className={styles.modal}>
          <div className={styles['modal-content']}>
            <h2>Confirmer la suppression</h2>
            <p>Êtes-vous sûr de vouloir supprimer cet étudiant ?</p>
            <div className={styles['modal-actions']}>
              <button onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
              <button onClick={confirmDelete}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Etudiant;
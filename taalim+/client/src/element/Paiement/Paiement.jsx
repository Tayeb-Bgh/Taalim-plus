import React, { useState, useEffect } from 'react';
import { AlertTriangle, DollarSign, Wallet, Search } from 'lucide-react';
import styles from './Paiement.module.css';
import StatCard from '../Utils/StatCard';

const Paiement = () => {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("students");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [unpaidSessions, setUnpaidSessions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    currentMonthRevenue: 0,
    urgentPaymentsAmount: 0,
    unpaidStudentsCount: 0
  });

  const [selectedSchoolYear, setSelectedSchoolYear] = useState(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);

  const [datePayment, setDatePayment] = useState(toFormatSql(new Date()));

  function toFormatSql(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}`
  }


  useEffect(() => {
    fetch('http://localhost:5000/paiement/dashboard-stats')
      .then(res => res.json())
      .then(data => {
        console.log("donnes :"+JSON.stringify(data));
        setDashboardStats(data)
      })
      .catch(err => console.error('Error fetching dashboard stats:', err));
  }, []);

  // Fetch students data
  useEffect(() => {
    fetch('http://localhost:5000/paiement/students')
      .then(res => res.json())
      .then(data => {
        setStudents(s => data);
        setGroups(g => [...new Set(students.map(student => student.groupName))]);
      })
      .catch(err => console.error('Error fetching students:', err));
  }, []);

  useEffect(() => {
    const uniqueGroups = [...new Set(students.map(student => student.groupName))];
    setGroups(uniqueGroups);
  }, [students]);

  // Fetch payment history
  useEffect(() => {
    fetch('http://localhost:5000/paiement/history')
      .then(res => res.json())
      .then(data => setPaymentHistory(data))
      .catch(err => console.error('Error fetching payment history:', err));
  }, []);

  useEffect(() => {
    fetch(`http://localhost:5000/paiement/revenue/${selectedSchoolYear.split('/')[0]}-${selectedSchoolYear.split('/')[1]}`)
      .then(res => res.json())
      .then(data => setMonthlyRevenue(data))
      .catch(err => console.error('Error fetching revenue:', err));
  }, [selectedSchoolYear]);

  const schoolYearMonths = [
    "Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février",
    "Mars", "Avril", "Mai"
  ];

  const handleOpenPaymentModal = async (student) => {
    setSelectedStudent(student);
    setSelectedSessions([]);

    try {
      const response = await fetch(`http://localhost:5000/paiement/unpaid-sessions/${student.id}`);
      const sessions = await response.json();
      setUnpaidSessions(sessions);
      setIsPaymentModalOpen(true);
    } catch (err) {
      console.error('Error fetching unpaid sessions:', err);
    }
  };



  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedStudent(null);
    setSelectedSessions([]);
    setUnpaidSessions([]);
  };

  const handleSessionSelect = (session) => {
    setSelectedSessions(prev =>
      prev.includes(session)
        ? prev.filter(s => s !== session)
        : [...prev, session]
    );
  };

 
  const handlePayment = async () => {
    if (!selectedStudent || selectedSessions.length === 0) return;

    try {
      const response = await fetch('http://localhost:5000/paiement/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          sessions: selectedSessions,
          datePayment: datePayment
        }),
      });

      if (response.ok) {
        const [studentsRes, historyRes] = await Promise.all([
          fetch('http://localhost:5000/paiement/students'),
          fetch('http://localhost:5000/paiement/history'),
        ]);

        setStudents(await studentsRes.json());
        setPaymentHistory(await historyRes.json());
        handleClosePaymentModal();
      } else {
        console.error('Payment processing failed.');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
    }
  };


  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedGroup === "all" || student.groupName === selectedGroup) &&
    (paymentFilter === "all" || (paymentFilter === "urgent" && student.unpaidSessions >= 3))
  );

  const filteredPaymentHistory = paymentHistory.filter(payment =>
    payment.studentName.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    payment.date.includes(historySearchTerm)
  );

  const totalUpcomingAmount = filteredStudents.reduce((sum, student) => sum + student.amountDue, 0);
 /*  const unpaidStudentsCount = students.filter(student => student.unpaidSessions >= 3).length; */


  return (
    <div className={styles.container}>
      <h1 className={styles.headerTitle}>Gestion des Paiements</h1>
      <div className={styles.cardGroup}>
        <StatCard
          title="Paiements à venir"
          value={dashboardStats.unpaidStudentsCount || 0}
          icon={AlertTriangle}
          description="Étudiants avec 3+ séances impayées"
        />
        <StatCard
          title="Revenus du mois"
          value={`${dashboardStats.currentMonthRevenue || 0} DA`}
          icon={DollarSign}
          description="Total des revenus ce mois-ci"
        />
        <StatCard
          title="Recettes prévues"
          value={`${dashboardStats.urgentPaymentsAmount || 0} DA`}
          icon={Wallet}
          description="Montant attendu des étudiants avec 3+ séances impayées"
        />
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'students' ? styles.active : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Gestion des Paiements
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Historique des Paiements
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'revenue' ? styles.active : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenus Mensuels
        </button>
      </div>

      {activeTab === 'students' && (
        <div className={styles.tabContent}>
          <h2 className={styles.tabTitle}>Gestion des Paiements</h2>
          <div className={styles.filters}>
            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Rechercher un étudiant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className={styles.select}
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="all">Tous les groupes</option>
              {groups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            <select
              className={styles.select}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">Tous les étudiants</option>
              <option value="urgent">Paiements urgents (3+)</option>
            </select>
          </div>
          <div className={styles["table-container"]}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Séances non payées</th>
                  <th>Groupe</th>
                  <th>Montant a payer</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>
                      <span className={`${styles.badge} ${student.unpaidSessions >= 4 ? styles.badgeRed : styles.badgeGray}`}>
                        {student.unpaidSessions}
                      </span>
                    </td>
                    <td>{student.groupName}</td>
                    <td>{student.amountDue} DA</td>
                    <td>
                      <button className={styles.button} onClick={() => handleOpenPaymentModal(student)} >
                        Payer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.totalAmount}>
            <strong>Montant total des seances non payé : {totalUpcomingAmount} DA</strong>
          </div>
        </div>
      )}



      {activeTab === 'history' && (
        <div className={styles.tabContent}>
          <h2 className={styles.tabTitle}>Historique des Paiements</h2>
          <div className={styles.filters}>
            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Rechercher par nom ou date..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className={styles["table-container-history"]}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date du paiement</th>
                  <th>Nom de l'étudiant</th>
                  <th>Groupe</th>
                  <th>Montant payé</th>
                  <th>Nombre de séances</th>
                </tr>
              </thead>
              <tbody>
                {filteredPaymentHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.date).toLocaleDateString()}</td>
                    <td>{payment.studentName}</td>
                    <td>{payment.groupName}</td>
                    <td>{payment.amount} DA</td>
                    <td>{payment.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPaymentHistory.length === 0 && (
            <div className={styles.noData}>
              Aucun paiement enregistré pour le moment.
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className={styles.tabContent}>
          <h2 className={styles.tabTitle}>Revenus Mensuels</h2>
          <div className={styles.filters}>
            <select
              className={styles.select}
              value={selectedSchoolYear}
              onChange={(e) => setSelectedSchoolYear(e.target.value)}
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={`${year}/${year + 1}`}>{`${year}/${year + 1}`}</option>
              ))}
            </select>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Revenus Totaux</th>
                <th>Séances Faites</th>
                
              </tr>
            </thead>
            <tbody>
              {schoolYearMonths.map((month, index) => {
                const monthData = monthlyRevenue.find(m => parseInt(m.month) === index + 9) || { total: 0, sessions: 0, students: 0 };
                return (
                  <tr key={index}>
                    <td>{month}</td>
                    <td>{monthData.total || 0} DA</td>
                    <td>{monthData.sessions || 0}</td>
                    
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className={styles.revenueStats}>
            <div>
              <h3>Revenus Totaux Annuels</h3>
              <p>{monthlyRevenue.reduce((sum, month) => sum + month.total, 0)} DA</p>
            </div>
            <div>
              <h3>Nombre Total de Séances</h3>
              <p>{monthlyRevenue.reduce((sum, month) => sum + month.sessions, 0)}</p>
            </div>
          </div>
        </div>
      )}
      {isPaymentModalOpen && selectedStudent && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 style={{textAlign:'center'}}>Paiement pour {selectedStudent.name}</h2>
            <h3>Date du Paiement</h3>
            <input
                    type="date"
                    id="end-date"
                    value={datePayment}
                    onChange={(e) => setDatePayment(e.target.value)}
                  />
            <h3>Séances non payées</h3>
            <div className={styles.sessionList}>
              {unpaidSessions.map((session) => (
                <div key={session.id} className={styles.sessionItem}>
                  <input
                    type="checkbox"
                    id={`session-${session.id}`}
                    checked={selectedSessions.includes(session)}
                    onChange={() => handleSessionSelect(session)}
                  />
                  <label htmlFor={`session-${session.id}`}>
                    Séance du {new Date(session.date).toLocaleDateString()} - {session.amount.toFixed(2)} DA
                  </label>
                </div>
              ))}
            </div>

            <div className={styles.totalAmount}>
              <strong>
                Montant total à payer : {selectedSessions.reduce((sum, session) => sum + session.amount, 0).toFixed(2)} DA
              </strong>
            </div>
            <div className={styles.modalActions}>
              <button className={styles["btn-primary"]} onClick={handlePayment} disabled={selectedSessions.length === 0 ? true : false}>
                Confirmer le paiement
              </button>
              <button className={styles["btn-secondary"]} onClick={handleClosePaymentModal}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Paiement;
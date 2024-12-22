import React, { useState, useEffect } from 'react';
import { Users, Calendar, School, ChartPie } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  CartesianGrid, Tooltip
} from 'recharts';
import StatCard from '../Utils/StatCard';
import styles from './Dashboard.module.css';
import { getDate } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeGroups: 0,
    weekSessions: 0,
    monthlyRevenue: 0
  });

  const [revenueData, setRevenueData] = useState([]);
  const [nextSessions, setNextSessions] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [nextSessionDate, setNextSessionDate] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const nextSessionsRes = await fetch(`http://localhost:5000/dashboard/next-sessions`);
        const sessionsData = await nextSessionsRes.json();
        console.log(await sessionsData);
        if (sessionsData.length > 0) {
          setNextSessionDate(new Date(sessionsData[0].dateSeance));
        }

        // Fetch other dashboard data
        const [statsRes, revenueRes, paymentsRes, attendanceRes] = await Promise.all([
          fetch('http://localhost:5000/dashboard/stats'),
          fetch('http://localhost:5000/dashboard/revenue'),
          fetch('http://localhost:5000/dashboard/pending-payments'),
          fetch('http://localhost:5000/dashboard/attendance-rate')
        ]);

        const [statsData, revenueData, paymentsData, attendanceData] = await Promise.all([
          statsRes.json(),
          revenueRes.json(),
          paymentsRes.json(),
          attendanceRes.json()
        ]);

        setStats(statsData);
        setRevenueData(processRevenueData(revenueData));
        setNextSessions(sessionsData);
        setPendingPayments(paymentsData);
        setAttendanceRate(attendanceData.rate);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const processRevenueData = (data) => {
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const startYear = currentMonth < 8 ? currentYear - 1 : currentYear;

    return months.map((month, index) => {
      // Adjust month number based on academic year (Sep = 9, Oct = 10, etc.)
      const monthNum = index < 4 ? index + 9 : index - 3;
      const year = index < 4 ? startYear : startYear + 1;
      const monthStr = String(monthNum).padStart(2, '0');

      // Find matching data point
      const dataPoint = data.find(d => {
        const [dataYear, dataMonth] = d.month.split('-');
        return Number(dataYear) === year && dataMonth === monthStr;
      });

      return {
        name: month,
        total: dataPoint ? dataPoint.total : 0
      };
    });
  };

  // Function to get end of today (23:59:59.999)
  const getEndOfToday = () => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); // Set time to 23:59:59.999
    return endOfToday;
  };

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.headerTitle}>Tableau de Bord</h1>
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Étudiants"
          value={stats.totalStudents}
          icon={Users}
          description="Total d'étudiants enregistrés "
        />
        <StatCard
          title="Groupes Actifs"
          value={stats.activeGroups}
          icon={School}
          description="Total de groupes enregistrés"
        />
        <StatCard
          title="Séances Cette Semaine"
          value={stats.weekSessions}
          icon={Calendar}
          description="Séances programmer pour cette semaine"
        />     
        <StatCard
          title="Taux de Présence"
          value={`${attendanceRate}%`}
          icon={ChartPie}
          description="Etudiants present cette semaine"
        />
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.chartSection}>
          <div className={styles.chartCard}>
            <h3>Aperçu des Revenus</h3>
            <ResponsiveContainer width="100%" height={200} className={styles["graphe"]}>
              <BarChart
                data={revenueData}
                margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  dy={5}
                  interval={0}
                  tickMargin={8} 
                />
                <YAxis
                  tickFormatter={(value) => `${value} DA`}
                  axisLine={false}
                  tickLine={false}
                  dx={-5}
                  width={80}
                />
                <Tooltip
                  formatter={(value) => `${value} DA`}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    padding: '8px'
                  }}
                  cursor={{ fill: 'transparent' }}
                  labelStyle={{ color: '#111827' }}
                />
                <Bar
                  dataKey="total"
                  fill="#444444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  barSize={40} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.paymentsCard}>
            <h3>Paiements en Attente</h3>
            <div className={styles.paymentsListContainer}>
              <div className={styles.paymentsList}>
                {pendingPayments.map((payment, index) => (
                  <div key={index} className={styles.paymentItem}>
                    <div className={styles.paymentInfo}>
                      <p className={styles.studentName}>{payment.nomEleve} {payment.prenomEleve}</p>
                      <p className={styles.sessionsCount}>{payment.unpaidSessions} séance(s) impayée(s)</p>
                    </div>
                    <div className={styles.paymentAmount}>
                      {payment.totalAmount} DA
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.paymentsTotal}>
              <span>Total des paiements en attente:</span>
              <span>{pendingPayments.reduce((sum, payment) => sum + payment.totalAmount, 0)} DA</span>
            </div>
          </div>
        </div>

        <div className={styles.rightSection}>
          <div className={styles.sessionsCard}>
            <h3>{
              new Date(nextSessionDate) > getEndOfToday() ? `Séances du ${new Date(nextSessionDate).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}` : "Séances d'Aujourd'hui"
            }</h3>
            <div className={styles.sessionsList}>
              {nextSessions.map((session, index) => (
                <div key={index} className={styles.sessionItem}>
                  <div className={styles.sessionInfo}>
                    <span className={styles.sessionTime}>
                      {new Date(session.dateSeance).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span>{session.nomGroupe}</span>
                  </div>
                  <div className={styles.sessionPayment}>
                    {session.totalAmount} DA
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.sessionsTotal}>
              <span>Total attendu:</span>
              <span>{nextSessions.reduce((sum, session) => sum + session.totalAmount, 0)} DA</span>
            </div>
          </div>

          <div className={styles.attendanceCard}>
            <h3>Revenus du Mois</h3>
            <div className={styles.attendanceContent}>
              <div className={styles.attendanceRate}>{stats.monthlyRevenue} DA</div>
              <p className={styles.attendanceTrend}>Cumul des revenus depuis le début du mois</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

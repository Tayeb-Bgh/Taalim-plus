import styles from './StatCard.module.css'

const StatCard = ({ title, value, icon: Icon, description }) => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <Icon className={styles.cardIcon} />
    </div>
    <div className={styles.cardContent}>
      <div className={styles.cardValue}>{value}</div>
      <p className={styles.cardDescription}>{description}</p>
    </div>
  </div>
);

export default StatCard;
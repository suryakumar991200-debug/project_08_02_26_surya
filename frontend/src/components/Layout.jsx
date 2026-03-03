import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <NavLink to="/" className={styles.logo}>
          <span className={styles.logoIcon}>◇</span>
          OpsMind AI
        </NavLink>
        <nav className={styles.nav}>
          <NavLink to="/" className={({ isActive }) => (isActive ? styles.navActive : '')} end>
            Chat
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => (isActive ? styles.navActive : '')}>
            Upload
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => (isActive ? styles.navActive : '')}>
            Documents
          </NavLink>
        </nav>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

import React from 'react';
import { useState } from 'react';
import { Link , useLocation} from 'react-router-dom';
import styles from './Sidebar.css';
import Logo from './assets/Logo.jsx'

const Sidebar = () => {

    const location = useLocation();
    const [active, setActive] = useState(location.pathname);
    
    const handleSetActive = (path) => {
        setActive(path);
    };

    return (
        <div className="sidebar">
            <div className="logo">
                <Logo className="pngLogo"/>
                <h1>Taalim+</h1>
            </div>
            <nav className="nav-menu">
                <ul>
                    <li className={`nav-item ${active === '/' ? 'active' : ''}`}>
                        <Link to="/" onClick={()=>handleSetActive('/')}>
                            <i className="icon dashboard-icon"></i>
                            Tableau de Bord
                        </Link>
                    </li>
                    <li className={`nav-item ${active === '/etudiant' ? 'active' : ''}`}>
                        <Link to="/etudiant" onClick={()=>handleSetActive('/etudiant')}>
                            <i className="icon assets-icon"></i>
                            Etudiant
                        </Link>
                    </li>
                    <li className={`nav-item ${active === '/groupe' ? 'active' : ''}`}>
                        <Link to="/groupe" onClick={()=>handleSetActive('/groupe')}>
                            <i className="icon booking-icon"></i>
                            Groupe
                        </Link>
                    </li>
                    <li className={`nav-item ${active === '/seance' ? 'active' : ''}`}>
                        <Link to="/seance" onClick={()=>handleSetActive('/seance')}>
                            <i className="icon seance-icon"></i>
                            Seance
                        </Link>
                    </li>
                    <li className={`nav-item ${active === '/paiement' ? 'active' : ''}`}>
                        <Link to="/paiement" onClick={()=>handleSetActive('/paiement')}>
                            <i className="icon paiement-icon"></i>
                            Paiement
                        </Link>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;

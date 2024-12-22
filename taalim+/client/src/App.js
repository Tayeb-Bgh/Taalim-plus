import './App.css';
import {BrowserRouter as Router,Routes,Route} from 'react-router-dom'

import Sidebar from './element/sidebar/Sidebar.jsx'
import Dashboard from './element/Dashboard/Dashboard.jsx';
import Etudiant from './element/Etudiant/Etudiant.jsx';
import Groupe from './element/Groupe/Groupe.jsx';
import Seance from './element/Seance/Seance.jsx';
import Paiement from './element/Paiement/Paiement.jsx';

function App() {

  return (
    <div className="App">
      <Router>
        <div className='sidebarLeft'>
          <Sidebar/>
        </div>
        <div className='main'>
          <Routes>
            <Route path='/' element={<Dashboard/>}></Route>
            <Route path='/etudiant' element={<Etudiant/>}></Route>
            <Route path='/groupe' element={<Groupe/>}></Route>
            <Route path='/seance' element={<Seance/>}></Route>
            <Route path='/paiement' element={<Paiement/>}></Route>
            <Route path='*' element={<h1>PAGE DON'T EXIST</h1>}/>
          </Routes>
        </div>
        
      </Router>
    </div>
  );
}

export default App;

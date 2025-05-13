import { useState } from 'react'
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import './App.scss'
import Navbar from './Components/NavBar/NavBar'
import Sidebar from './Components/Sidebar/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import Ratecard from './pages/Ratecard/Ratecard';
import SchedulePlanner from './pages/SchedulePlanner/SchedulePlanner';

function App() {
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
  return (
    <div className="app fixed bg-white dark:bg-dark-4 w-screen h-screen flex flex-col">
      <Router>
        <Navbar sidebarIsOpen={sidebarIsOpen} setSidebarIsOpen={setSidebarIsOpen} />
        <div className="flex flex-1 overflow-hidden">
          <div className={`transition-all duration-300 ${sidebarIsOpen ? 'w-60' : 'w-0'}`}>
            <Sidebar sidebarIsOpen={sidebarIsOpen} />
          </div>
          <Routes>
            <Route className="flex-1 overflow-auto" path='/dashboard' element={<Dashboard />} />
            <Route className="flex-1 overflow-auto" path='/rate-card' element={<Ratecard />} />
            <Route className="flex-1 overflow-auto" path='/planner' element={<SchedulePlanner />} />
          </Routes>
        </div>
      </Router >
    </div >
  );
}

export default App

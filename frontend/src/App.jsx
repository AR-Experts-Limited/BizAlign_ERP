import { useState, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import { startSSE, stopSSE } from './features/sse/sseSlice';

import './App.scss'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Navbar from './components/NavBar/NavBar'
import Sidebar from './components/Sidebar/Sidebar';
import LandingPage from './pages/LandingPage/LandingPage'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard';
import Ratecard from './pages/Ratecard/Ratecard';
import Notifications from './pages/Notifications/Notifications';
import SchedulePlanner from './pages/SchedulePlanner/SchedulePlanner';
import Rota from './pages/Rota/Rota';
import LiveOperations from './pages/LiveOperations/LiveOperations';
import Instalments from './pages/Instalments/Instalments';
import Deductions from './pages/Deductions/Deductions';
import Incentives from './pages/Incentives/Incentives';
import ManageUsers from './pages/ManageUsers/ManageUsers';
import ManagePersonnels from './pages/ManagePersonnels/ManagePersonnels'
import Approvals from './pages/Approvals/Approvals';
import DailyInvoice from './pages/Invoice/DailyInvoice/DailyInvoice';
import WeeklyInvoice from './pages/Invoice/WeeklyInvoice/WeeklyInvoice';
import ManageSummary from './pages/ManageSummary/ManageSummary';
import ApplicationSettings from './pages/ApplicationSettings/ApplicationSettings';
import AdditionalCharges from './pages/AdditionalCharges/AdditionalCharges';


function App() {
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
  const location = useLocation();
  const hideLayout = location.pathname === '/login' || location.pathname === '/';
  const dispatch = useDispatch();
  const driversLoading = useSelector((state) => state.drivers.driverStatus);
  const sitesLoading = useSelector((state) => state.sites.siteStatus);
  const ratecardsLoading = useSelector((state) => state.ratecards.ratecardStatus);

  const isLoading = driversLoading === 'loading' || sitesLoading === 'loading' || ratecardsLoading === 'loading';



  useEffect(() => {
    dispatch(startSSE());

    return () => {
      dispatch(stopSSE());
    };
  }, [dispatch]);


  const routes = [
    { path: "/dashboard", name: "Dashboard", component: Dashboard },
    { path: "/rate-card", name: "Rate Cards", component: Ratecard },
    { path: "/planner", name: "Schedule Planner", component: SchedulePlanner },
    { path: "/manage-personnels", name: "Manage Personnels", component: ManagePersonnels },
    { path: "/notifications", name: "Notifications", component: Notifications },
    { path: "/approvals", name: "Approvals", component: Approvals },
    { path: "/live-operations", name: "Live Operations", component: LiveOperations },
    { path: "/rota", name: "Rota", component: Rota },
    { path: "/deductions", name: "Deductions", component: Deductions },
    { path: "/installments", name: "Installments", component: Instalments },
    { path: "/incentives", name: "Incentives", component: Incentives },
    { path: "/manage-summary", name: "Manage Summary", component: ManageSummary },
    { path: "/manage-payments", name: "Manage Payments", component: DailyInvoice },
    { path: "/add-ons", name: "Additional Charges", component: AdditionalCharges },
    { path: "/print-invoices", name: "Print Invoices", component: WeeklyInvoice },
    { path: "/manage-users", name: "Manage Users", component: ManageUsers },
    { path: "/settings", name: "Application Settings", component: ApplicationSettings },

  ];



  return (
    <div className="app fixed bg-stone-100 dark:bg-dark-4 w-screen h-screen flex flex-col">
      {!hideLayout && <Navbar sidebarIsOpen={sidebarIsOpen} setSidebarIsOpen={setSidebarIsOpen} />}

      <div className="flex flex-1 overflow-hidden">
        {!hideLayout && (
          <div className={`transition-all duration-300 ${sidebarIsOpen ? 'w-45 md:w-60' : 'w-0 md:w-18'}`}>
            <Sidebar sidebarIsOpen={sidebarIsOpen} />
          </div>
        )}

        <div className={`flex-1 overflow-auto ${sidebarIsOpen && 'max-sm:blur-xs max-sm:pointer-events-none '}`} >
          {(isLoading)
            ? <div className='h-full w-full flex justify-center items-center '><img className='w-50 h-30' src="/bizalign_loading_loop.gif" /></div> // You can show a spinner here

            : (<Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              {routes.map(({ path, name, component: Component }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute routeName={name}>
                      <Component />
                    </ProtectedRoute>
                  }
                />
              ))}
              {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
            </Routes>)}
        </div>
      </div>
    </div >
  );
}

export default App

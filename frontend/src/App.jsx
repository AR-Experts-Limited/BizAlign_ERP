import { useState } from 'react'
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import './App.scss'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Navbar from './Components/NavBar/NavBar'
import Sidebar from './Components/Sidebar/Sidebar';
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard';
import Ratecard from './pages/Ratecard/Ratecard';
import SchedulePlanner from './pages/SchedulePlanner/SchedulePlanner';

function App() {
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
  const location = useLocation();
  const hideLayout = location.pathname === '/login';

  const routes = [
    { path: "/dashboard", name: "Dashboard", component: Dashboard },
    { path: "/rate-card", name: "Rate Cards", component: Ratecard },
    { path: "/planner", name: "Schedule Planner", component: SchedulePlanner },
    // { path: "/manage-personnels", name: "Manage Personnels", component: ManageDrivers },
    // { path: "/manage-fleet", name: "Manage Fleet", component: ManageFleet },
    //{ path: "/notifications", name: "Notifications", component: Notifications },
    // { path: "/live-operations", name: "Live Operations", component: LiveOperations },
    // { path: "/rota", name: "Rota", component: Rota },
    // { path: "/deductions", name: "Deductions", component: DriverDeduction },
    // { path: "/working-hours", name: "Working Hours", component: WorkingHours },
    // { path: "/installments", name: "Installments", component: Installments },
    // { path: "/incentives", name: "Incentives", component: Incentives },
    // { path: "/approvals", name: "Approvals", component: Approvals },
    // { path: "/manage-summary", name: "Manage Summary", component: ManageSummary },
    // { path: "/manage-payments", name: "Manage Payments", component: ManagePayments },
    // { path: '/add-ons', name: 'Additional Charges', component: AdditionalCharges },
    // { path: "/print-invoices", name: "Print Invoices", component: PrintInvoices },
    // { path: "/profit-loss", name: "Profit / Loss", component: ProfitLoss },
    // { path: "/application-settings", name: "Application Settings", component: ApplicationSettings },
  ];

  return (
    <div className="app fixed bg-white dark:bg-dark-4 w-screen h-screen flex flex-col">

      {!hideLayout && <Navbar sidebarIsOpen={sidebarIsOpen} setSidebarIsOpen={setSidebarIsOpen} />}

      <div className="flex flex-1 overflow-hidden">
        {!hideLayout &&
          <div className={`transition-all duration-300 ${sidebarIsOpen ? 'w-60' : 'w-0'}`}>
            <Sidebar sidebarIsOpen={sidebarIsOpen} />
          </div>}

        <Routes>
          <Route path='/login' element={<Login />} />
          {routes.map(({ path, name, component: Component }) => (
            <Route
              className="flex-1 overflow-auto"
              key={path}
              path={path}
              element={
                <ProtectedRoute routeName={name}>
                  <Component />
                </ProtectedRoute>
              }
            />
          ))}
        </Routes>
      </div>
    </div >
  );
}

export default App

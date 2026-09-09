import "bootstrap/dist/css/bootstrap.css";
import "react-calendar/dist/Calendar.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomeComponent from "./components/home-component";
import RegisterComponent from "./components/register-component";
import LoginComponent from "./components/login-component";
import FmaQueryComponent from "./components/fma-query-component";
import FmaTableComponent from "./components/fma-table-component";
import QueryResultComponent from "./components/query-result-component";
import UserManagementComponent from "./components/user-management-component";
import ProtectedRoute from "./components/ProtectedRoute";

// 良率系統畫面
import YieldDashboard from "./components/yield-system/views/Dashboard";
import YieldEqActions from "./components/yield-system/views/MachineStatusView";
import ExternalLinksView from "./components/yield-system/views/ExternalLinksView";
import YieldUnfinishLot from "./components/yield-system/views/UnfinishLotView";
import YieldEdcRange from "./components/yield-system/views/EdcRangeView";

import { AuthProvider } from "./contexts/AuthContext";
import { DashboardProvider } from "./contexts/DashboardContext";
import { FmaProvider } from "./contexts/FmaContext";

function protectedRoute(path, element) {
  return (
    <Route
      key={path}
      path={path}
      element={
        <ProtectedRoute requiredPermission="operator">{element}</ProtectedRoute>
      }
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <FmaProvider>
        <DashboardProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomeComponent />} />
                <Route path="register" element={<RegisterComponent />} />
                <Route path="login" element={<LoginComponent />} />

                {protectedRoute("fmaquery", <FmaQueryComponent />)}
                {protectedRoute("fmatable", <FmaTableComponent />)}
                {protectedRoute("queryResult", <QueryResultComponent />)}
                {protectedRoute("users", <UserManagementComponent />)}
                {protectedRoute("yield-dashboard", <YieldDashboard />)}
                {protectedRoute("yield-eq-actions", <YieldEqActions />)}
                {protectedRoute("yield-unfinish-lot", <YieldUnfinishLot />)}
                {protectedRoute("yield-edc-range", <YieldEdcRange />)}
                {protectedRoute("external-links", <ExternalLinksView />)}
              </Route>
            </Routes>
          </BrowserRouter>
        </DashboardProvider>
      </FmaProvider>
    </AuthProvider>
  );
}

export default App;

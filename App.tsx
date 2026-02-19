import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from './types';
import { AuthProvider, useAuth } from './AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import PlansPage from './pages/PlansPage';
import AdminDashboard from './pages/AdminDashboard';
import ClipGenerator from './pages/ClipGenerator';
import Gallery from './pages/Gallery';

// Componente de Proteção de Rota
const PrivateRoute = ({ children, adminOnly = false }: { children?: React.ReactNode, adminOnly?: boolean }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/dashboard"
              element={<PrivateRoute><Dashboard /></PrivateRoute>}
            />
            <Route
              path="/gerador"
              element={<PrivateRoute><ClipGenerator /></PrivateRoute>}
            />
            <Route
              path="/galeria"
              element={<PrivateRoute><Gallery /></PrivateRoute>}
            />
            <Route
              path="/planos"
              element={<PrivateRoute><PlansPage /></PrivateRoute>}
            />
            <Route
              path="/admin"
              element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
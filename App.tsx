
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from './types.ts';
import { AuthProvider, useAuth } from './AuthContext.tsx';
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import Dashboard from './pages/Dashboard.tsx';
import PlansPage from './pages/PlansPage.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import ClipGenerator from './pages/ClipGenerator.tsx';

// Componente de Proteção de Rota
// Fix: Marking children as optional in the prop type definition to resolve TypeScript errors where the compiler 
// does not correctly map JSX children to a required 'children' prop on plain functional components in some environments.
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

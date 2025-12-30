import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LedgerProvider } from './context/LedgerContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { History } from './pages/History';
import { Routines } from './pages/Routines';
import { Scan } from './pages/Scan';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--color-bg-deep)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            color: 'var(--color-primary)',
            fontSize: '2.5rem',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            textShadow: '0 0 20px var(--color-primary-glow)'
          }}>
            intake
          </h1>
          <p style={{ 
            color: 'var(--color-gray-500)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            Initializing HUD...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { userData, loading } = useAuth();

  if (loading) {
    return null;
  }

  // If user hasn't completed onboarding, redirect to onboarding
  if (userData && !userData.onboardingComplete) {
    return <Navigate to="/onboarding" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (currentUser) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/onboarding" element={
        <PrivateRoute>
          <Onboarding />
        </PrivateRoute>
      } />
      <Route path="/" element={
        <PrivateRoute>
          <OnboardingCheck>
            <LedgerProvider>
              <Layout />
            </LedgerProvider>
          </OnboardingCheck>
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="routines" element={<Routines />} />
        <Route path="scan" element={<Scan />} />
      </Route>
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

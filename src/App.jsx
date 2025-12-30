import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LedgerProvider } from './context/LedgerContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Routines } from './pages/Routines';
import { Scan } from './pages/Scan';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-deep">
        <div className="text-center">
          <h1 className="font-display text-primary text-[2.5rem] mb-md uppercase tracking-[0.2em] shadow-primary-glow">
            intake
          </h1>
          <p className="text-gray-500 font-display text-[0.8rem] uppercase tracking-[0.1em]">
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

function OnboardingCheck({ children }) {
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

function PublicRoute({ children }) {
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

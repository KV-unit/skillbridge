import { Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SetupNeeded from './components/SetupNeeded.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfileEditPage from './pages/ProfileEditPage.jsx';
import CredentialsPage from './pages/CredentialsPage.jsx';
import AssessmentsPage from './pages/AssessmentsPage.jsx';
import AssessmentTakePage from './pages/AssessmentTakePage.jsx';
import BridgingPage from './pages/BridgingPage.jsx';
import TalentPage from './pages/TalentPage.jsx';
import PublicProfilePage from './pages/PublicProfilePage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import ImpactPage from './pages/ImpactPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  const { configured } = useAuth();
  if (!configured) return <SetupNeeded />;

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/talent" element={<TalentPage />} />
          <Route path="/p/:slug" element={<PublicProfilePage />} />
          <Route path="/bridging" element={<BridgingPage />} />
          <Route path="/impact" element={<ImpactPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileEditPage /></ProtectedRoute>} />
          <Route path="/credentials" element={<ProtectedRoute><CredentialsPage /></ProtectedRoute>} />
          <Route path="/assessments" element={<ProtectedRoute><AssessmentsPage /></ProtectedRoute>} />
          <Route path="/assessments/:id" element={<ProtectedRoute><AssessmentTakePage /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute role="reviewer"><ReviewPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

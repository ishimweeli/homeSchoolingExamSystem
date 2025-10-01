import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProfessionalLanding from './pages/ProfessionalLanding'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import AuthCallback from './pages/AuthCallback'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ResendVerification from './pages/ResendVerification'
import VerifyEmail from './pages/VerifyEmail'
import Students from './pages/Students'
import Dashboard from './pages/Dashboard'
import ExamView from './pages/ExamView'
import ExamCreate from './pages/ExamCreate'
import ExamCreateSimple from './pages/ExamCreateSimple'
import ExamsListSimple from './pages/ExamsListSimple'
import ExamCreateProfessional from './pages/ExamCreateProfessional'
import ExamsProfessional from './pages/ExamsProfessional'
import ModuleCreate from './pages/ModuleCreate'
import ModuleView from './pages/ModuleView'
import StudyModules from './pages/StudyModules'
import AITools from './pages/AITools'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'
import AdminTiers from './pages/AdminTiers'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<ProfessionalLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/resend-verification" element={<ResendVerification />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        
        {/* Protected routes with shared layout */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
        <Route path="/exams" element={<ProtectedRoute><ExamsProfessional /></ProtectedRoute>} />
        <Route path="/exams/create" element={<ProtectedRoute><ExamCreate /></ProtectedRoute>} />
        <Route path="/exams/create-simple" element={<ProtectedRoute><ExamCreateSimple /></ProtectedRoute>} />
        <Route path="/exams/create-professional" element={<ProtectedRoute><ExamCreateProfessional /></ProtectedRoute>} />
        <Route path="/exams/:id" element={<ProtectedRoute><ExamView /></ProtectedRoute>} />
        <Route path="/modules" element={<ProtectedRoute><StudyModules /></ProtectedRoute>} />
        <Route path="/modules/create" element={<ProtectedRoute><ModuleCreate /></ProtectedRoute>} />
        <Route path="/modules/:id" element={<ProtectedRoute><ModuleView /></ProtectedRoute>} />
        <Route path="/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/admin/tiers" element={<ProtectedRoute><AdminTiers /></ProtectedRoute>} />
      </Routes>
    </Router>
  )
}

export default App

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/layout/Navbar'
import { Sidebar } from './components/layout/Sidebar'
import { MobileNav } from './components/layout/MobileNav'
import Dashboard from './pages/Dashboard'
import ResearchDiscovery from './pages/ResearchDiscovery'
import IntegrityAdvisor from './pages/IntegrityAdvisor'
import WritingSupport from './pages/WritingSupport'
import SourceOrganiser from './pages/SourceOrganiser'
import GrantChecker from './pages/GrantChecker'
import Login from './pages/Login'
import Register from './pages/Register'

function PrivateRoute({ children }) {
  return children
}

function AppLayout({ children }) {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
        <PrivateRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/research" element={
        <PrivateRoute>
          <AppLayout>
            <ResearchDiscovery />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/integrity" element={
        <PrivateRoute>
          <AppLayout>
            <IntegrityAdvisor />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/writing" element={
        <PrivateRoute>
          <AppLayout>
            <WritingSupport />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/sources" element={
        <PrivateRoute>
          <AppLayout>
            <SourceOrganiser />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/grant" element={
        <PrivateRoute>
          <AppLayout>
            <GrantChecker />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

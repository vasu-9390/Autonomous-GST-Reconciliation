import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CopilotChatModal } from './components/CopilotChatModal';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportCenterPage } from './pages/ImportCenterPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ReportsPage } from './pages/ReportsPage';
import { TeamPage } from './pages/TeamPage';
import { AuditPage } from './pages/AuditPage';

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [copilotChatOpen, setCopilotChatOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-brand-400">
        Loading Autonomous GST Copilot...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar onOpenCopilotChat={() => setCopilotChatOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/imports" element={<ImportCenterPage />} />
            <Route path="/reconciliations" element={<ReconciliationPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Conversational AI Copilot Modal */}
      <CopilotChatModal
        isOpen={copilotChatOpen}
        onClose={() => setCopilotChatOpen(false)}
      />
    </div>
  );
};

const LoginRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;

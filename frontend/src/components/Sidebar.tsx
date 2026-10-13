import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  UploadCloud,
  FileCheck2,
  Search,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Bot,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  onOpenCopilotChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCopilotChat }) => {
  const { user, quickLogin } = useAuth();

  const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Import Center', to: '/imports', icon: UploadCloud },
    { label: 'Reconciliation', to: '/reconciliations', icon: FileCheck2 },
    { label: 'Investigation Workspace', to: '/workspace', icon: Search },
    { label: 'Reports & Exports', to: '/reports', icon: FileSpreadsheet },
    { label: 'Team & RBAC', to: '/team', icon: Users },
    { label: 'Audit Trail', to: '/audit', icon: ShieldCheck },
  ];

  const roles: { role: UserRole; label: string }[] = [
    { role: 'SUPER_ADMIN', label: 'Super Admin' },
    { role: 'FINANCE_MANAGER', label: 'Finance Mgr' },
    { role: 'ACCOUNTANT', label: 'Accountant' },
    { role: 'AUDITOR', label: 'Auditor' },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-teal-accent flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            GST Copilot
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-brand-500/20 text-brand-300 border border-brand-500/30">
              AI
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">Autonomous Reconciliation</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* AI Copilot Ask Button */}
        <div className="pt-4">
          <button
            onClick={onOpenCopilotChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-950/40 transition-all border border-brand-400/30 group"
          >
            <Bot className="w-4 h-4 group-hover:animate-pulse" />
            <span>Ask GST Copilot</span>
          </button>
        </div>
      </nav>

      {/* Quick Role Switcher for Demo / Evaluation */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Demo Role Switcher</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-brand-300 font-mono">
            {user?.role}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {roles.map((r) => (
            <button
              key={r.role}
              onClick={() => quickLogin(r.role)}
              className={`px-2 py-1.5 rounded text-xs text-left transition-colors font-medium border ${
                user?.role === r.role
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

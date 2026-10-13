import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Sparkles, Shield, ArrowRight, Lock, Mail, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickLogin, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('finance@gstcopilot.io');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');

  // If already authenticated, redirect to dashboard immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setError('');
    try {
      await quickLogin(role);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-accent text-white shadow-xl shadow-brand-500/20 mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            GST Reconciliation Copilot
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Autonomous multi-tenant reconciliation, discrepancy diagnosis & ITC protection for Indian enterprises
          </p>
        </div>

        {/* Login Form Card */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  placeholder="finance@company.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all shadow-md shadow-brand-950/40 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center">
              Quick One-Click Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('FINANCE_MANAGER')}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-800/80 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-brand-400">Finance Manager</div>
                <div className="text-[10px] text-slate-400">Approval & exports</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('ACCOUNTANT')}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-800/80 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-brand-400">Accountant</div>
                <div className="text-[10px] text-slate-400">Imports & review</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('SUPER_ADMIN')}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-800/80 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-brand-400">Super Admin</div>
                <div className="text-[10px] text-slate-400">Org & team admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('AUDITOR')}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-800/80 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-brand-400">Auditor (KPMG)</div>
                <div className="text-[10px] text-slate-400">Read-only audit trail</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Decimal-safe precision
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-brand-400" /> Multi-tenant isolation
          </span>
        </div>
      </div>
    </div>
  );
};

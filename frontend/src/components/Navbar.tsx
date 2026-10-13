import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Building2, Check, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Organization Info */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-brand-400">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">
              {user?.organizationName || 'Bharat Enterprise Solutions Pvt Ltd'}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/80 text-brand-400 border border-slate-700/60">
              {user?.organizationGstin || '27AABCB1234D1ZM'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <span className="text-xs font-semibold text-slate-200">System Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => markAsRead(n._id)}
                      className={`p-3 text-xs transition-colors cursor-pointer ${
                        n.isRead ? 'bg-slate-900/40 text-slate-400' : 'bg-brand-950/20 text-slate-200 font-medium'
                      } hover:bg-slate-800/60`}
                    >
                      <div className="font-semibold text-white mb-0.5">{n.title}</div>
                      <p className="line-clamp-2 text-slate-400">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="text-right">
            <span className="text-sm font-semibold text-slate-200 block leading-tight">{user?.name}</span>
            <span className="text-[10px] font-medium text-brand-400 flex items-center justify-end gap-1">
              <ShieldCheck className="w-3 h-3" />
              {user?.role?.replace(/_/g, ' ')}
            </span>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

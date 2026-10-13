import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'brand' | 'success' | 'danger' | 'warning' | 'default';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
}) => {
  const variantStyles = {
    brand: 'border-brand-500/20 bg-gradient-to-br from-brand-950/40 to-slate-900/60 text-brand-400',
    success: 'border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 text-emerald-400',
    danger: 'border-rose-500/20 bg-gradient-to-br from-rose-950/40 to-slate-900/60 text-rose-400',
    warning: 'border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-slate-900/60 text-amber-400',
    default: 'border-slate-800 bg-slate-900/60 text-slate-400',
  };

  return (
    <div className={`p-5 rounded-xl border backdrop-blur-sm transition-all hover:border-slate-700 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2 rounded-lg bg-slate-800/80`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white currency-font">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};

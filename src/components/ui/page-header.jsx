import React from 'react';
import { cn } from "@/lib/utils";

export function PageHeader({ 
  title, 
  description, 
  badge, 
  icon: Icon,
  actions,
  className 
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3 flex-wrap">
        {Icon && <Icon className="w-6 h-6 text-blue-600" />}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {badge && (
          <span className="px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.12em] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-slate-500">{description}</p>
      )}
      {actions && (
        <div className="flex gap-3 mt-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export function PageSection({ 
  title, 
  description, 
  children, 
  className,
  headerClassName 
}) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden", className)}>
      {(title || description) && (
        <div className={cn("px-6 py-5 border-b border-slate-100", headerClassName)}>
          {title && (
            <p className="text-sm font-semibold text-slate-800">{title}</p>
          )}
          {description && (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className={cn(!title && !description && "p-6", title || description ? "px-6 py-5" : "")}>
        {children}
      </div>
    </div>
  );
}

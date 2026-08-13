import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsCard({ title, value, icon: Icon, bgColor, isLoading }) {
  return (
    <Card className="relative overflow-hidden bg-white shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200">
      <div className={`absolute top-0 right-0 w-20 h-20 transform translate-x-4 -translate-y-4 ${bgColor} rounded-full opacity-10`} />
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.05em]">{title}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-2" />
            ) : (
              <p className="text-xl font-bold text-slate-900 mt-1">
                {value}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${bgColor} bg-opacity-15`}>
            <Icon className={`w-5 h-5 ${bgColor.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
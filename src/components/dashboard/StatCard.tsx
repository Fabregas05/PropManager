import { ReactNode } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  amount: string;
  percentage: string;
  isPositive: boolean;
  icon: ReactNode;
  theme: "indigo" | "emerald" | "amber" | "rose";
}

const themeStyles = {
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    iconBg: "bg-indigo-500/10",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    iconBg: "bg-amber-500/10",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-600",
    iconBg: "bg-rose-500/10",
  }
};

export function StatCard({ title, amount, percentage, isPositive, icon, theme }: StatCardProps) {
  const styles = themeStyles[theme];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.bg} ${styles.text} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {percentage}
        </div>
      </div>
      
      <div>
        <h3 className="text-3xl font-bold text-slate-800 mb-1 tracking-tight">{amount}</h3>
        <p className="text-sm font-medium text-slate-500">{title}</p>
      </div>
    </div>
  );
}

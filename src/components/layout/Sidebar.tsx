import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  Settings,
  CreditCard,
  Building,
  ChevronRight
} from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-[280px] bg-slate-950 text-slate-400 flex-shrink-0 min-h-screen flex flex-col border-r border-slate-900/50">
      {/* Brand */}
      <div className="h-20 flex items-center px-8 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Building className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">PropManager</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col gap-8">
        
        {/* Main Menu */}
        <div>
          <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Overview
          </div>
          <nav className="space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-transparent text-indigo-400 font-medium relative group transition-all"
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>
              <LayoutDashboard size={20} className="text-indigo-400" />
              <span>Dashboard</span>
              <ChevronRight size={16} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </nav>
        </div>

        {/* Management Menu */}
        <div>
          <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Management
          </div>
          <nav className="space-y-1">
            <Link
              href="/properties"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900/50 hover:text-slate-200 transition-all group"
            >
              <Home size={20} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              <span className="font-medium">Biens Immobiliers</span>
            </Link>
            <Link
              href="/tenants"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900/50 hover:text-slate-200 transition-all group"
            >
              <Users size={20} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              <span className="font-medium">Locataires</span>
            </Link>
            <Link
              href="/payments"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900/50 hover:text-slate-200 transition-all group"
            >
              <CreditCard size={20} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              <span className="font-medium">Paiements & Loyers</span>
            </Link>
            <Link
              href="/documents"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900/50 hover:text-slate-200 transition-all group"
            >
              <FileText size={20} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              <span className="font-medium">Documents & Baux</span>
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Bottom Settings */}
      <div className="p-4 border-t border-slate-800/50">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900/50 hover:text-slate-200 transition-all group"
        >
          <Settings size={20} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
          <span className="font-medium">Paramètres</span>
        </Link>
      </div>
    </aside>
  );
}

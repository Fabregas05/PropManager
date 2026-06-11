"use client";

import { Search, Bell, Menu, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { profile, signOut } = useAuth();

  return (
    <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-30 transition-all">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-slate-100/80 rounded-xl text-slate-500 transition-colors md:hidden">
          <Menu size={24} />
        </button>
        <div className="relative max-w-md w-full hidden md:block group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 bg-white/50 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            placeholder="Rechercher des biens, locataires, transactions..."
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-slate-400 hover:text-slate-700 transition-all relative p-2 hover:bg-slate-100 rounded-full">
          <Bell size={20} />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_0_2px_#fff]"></span>
        </button>

        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 p-1 rounded-full border border-slate-100 bg-white shadow-sm pr-4">
            <img 
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.full_name || "Felix"}&backgroundColor=e2e8f0`} 
              alt="Admin" 
              className="w-10 h-10 rounded-full bg-slate-100 object-cover shadow-sm"
            />
            <div className="hidden sm:flex flex-col items-start">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {profile?.full_name || "Propriétaire"}
              </p>
              <p className="text-xs text-slate-500 font-medium">Bailleur</p>
            </div>
          </div>

          <button 
            onClick={signOut}
            title="Se déconnecter"
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}


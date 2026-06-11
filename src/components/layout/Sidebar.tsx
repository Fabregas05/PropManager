import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  Settings,
  CreditCard,
  Building,
  ChevronRight,
  X
} from "lucide-react";

export function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };
  return (
    <>
      {/* backdrop for mobile when open */}
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden sidebar-backdrop" />}

      <aside className={`fixed inset-y-0 left-0 z-40 transform w-[280px] bg-slate-950 text-slate-400 flex-shrink-0 min-h-screen flex flex-col border-r border-slate-900/50 transition-transform duration-220 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static ${isOpen ? 'mobile-sidebar-paper' : ''}`}>
        {/* Brand */}
        <div className="h-20 flex items-center px-8 border-b border-slate-800/50 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">PropManager</span>
          </div>
          <button onClick={onClose} aria-label="Fermer le menu" className="absolute right-4 top-4 md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-900/30 rounded-lg focus-ring">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col gap-8">
          {/* Main Menu */}
          <div>
            <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Overview
            </div>
            <nav className="space-y-1">
              {(() => {
                const href = "/";
                const active = isActive(href);
                return (
                  <Link
                    href={href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${active ? 'bg-gradient-to-r from-indigo-500/10 to-transparent text-indigo-400 font-medium relative' : 'hover:bg-slate-900/50 hover:text-slate-200'}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>}
                    <LayoutDashboard size={20} className={active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'} />
                    <span>Dashboard</span>
                    <ChevronRight size={16} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })()}
            </nav>
          </div>

          {/* Management Menu */}
          <div>
            <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Management
            </div>
            <nav className="space-y-1">
              {(() => {
                const items = [
                  { href: '/properties', icon: Home, label: 'Biens Immobiliers' },
                  { href: '/tenants', icon: Users, label: 'Locataires' },
                  { href: '/payments', icon: CreditCard, label: 'Paiements & Loyers' },
                  { href: '/documents', icon: FileText, label: 'Documents & Baux' },
                ];

                return items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon as any;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${active ? 'bg-gradient-to-r from-indigo-500/10 to-transparent text-indigo-400 font-medium relative' : 'hover:bg-slate-900/50 hover:text-slate-200'}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>}
                      <Icon size={20} className={active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                });
              })()}
            </nav>
          </div>
        </div>

        {/* Bottom Settings */}
        <div className="p-4 border-t border-slate-800/50">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900/50 hover:text-slate-200 transition-all group"
            onClick={onClose}
          >
            <Settings size={20} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            <span className="font-medium">Paramètres</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

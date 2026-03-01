import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Newspaper,
  Send,
  Settings,
  Shield,
  Users,
} from 'lucide-react';

export default function Sidebar() {
  const { t } = useTranslation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/news', icon: Newspaper, label: t('nav.news') },
    { path: '/posts', icon: Send, label: t('nav.posts') },
    { path: '/sessions', icon: Users, label: t('nav.sessions') },
    { path: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <aside className="w-64 bg-dark-card border-r border-dark-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Web3 News</h1>
            <p className="text-xs text-slate-400">Security Agent</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-dark-border'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-border">
        <p className="text-xs text-slate-500 text-center">
          Version 1.0.0
        </p>
      </div>
    </aside>
  );
}

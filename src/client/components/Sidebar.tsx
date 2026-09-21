import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useAuthStore, useBrandingStore } from '../lib/store';

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { settings } = useBrandingStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/bots', label: 'Bots', icon: Bot },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-white/10 text-white'
        : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
    }`;

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-[#1a1a1a] p-2 text-gray-400 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/5 bg-[#0a0a0a] transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
                  {settings.siteName?.[0] || 'D'}
                </div>
              )}
              <span className="text-lg font-bold text-white">{settings.siteName || 'DiscordHost'}</span>
            </div>
          )}
          <button
            className="hidden rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white lg:block"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <button
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <link.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Shield className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Admin</span>}
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/5 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium text-white">
                  {user?.username || 'User'}
                </div>
                <div className="truncate text-xs text-gray-500">
                  {user?.email || ''}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-red-400"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full justify-center rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

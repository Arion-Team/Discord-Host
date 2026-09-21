import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Bot,
  CreditCard,
  Palette,
  FileText,
  Settings,
  ChevronLeft,
  Menu,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore, useBrandingStore } from '../lib/store';

const AdminSidebar: React.FC = () => {
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
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/bots', label: 'Bots', icon: Bot },
    { to: '/admin/plans', label: 'Plans', icon: CreditCard },
    { to: '/admin/branding', label: 'Branding', icon: Palette },
    { to: '/admin/logs', label: 'Logs', icon: FileText },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
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
                <img src={settings.logo} alt="Logo" className="h-6 w-6 rounded object-contain" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded bg-white text-xs font-bold text-black">
                  A
                </div>
              )}
              <span className="text-sm font-bold text-white">{settings.siteName || 'DiscordHost'}</span>
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
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all duration-200 mb-2"
            onClick={() => setMobileOpen(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Back to Panel</span>}
          </NavLink>

          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <link.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium text-white">
                  {user?.username || 'Admin'}
                </div>
                <div className="truncate text-xs text-gray-500">Administrator</div>
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

export default AdminSidebar;

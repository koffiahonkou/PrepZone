import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  FileQuestion,
  Award,
  Users,
  Layers,
  GraduationCap,
  Settings,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Bell,
  Home,
  CheckCircle2,
  Palette,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useColorMode } from '@/src/context/ColorModeContext';
import { EduFormLogo } from '@/src/components/brand/EduFormLogo';
import { NotificationBell } from './NotificationBell';
import { dataStore } from '@/src/services/dataStore';
import { SYSTEM_THEMES, getTheme } from '@/src/lib/themes';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

export const AppLayout: React.FC = () => {
  const { profile, signOut, isAdmin, isTeacher } = useAuth();
  const { isNight, toggleMode } = useColorMode();
  const [settings, setSettings] = useState(() => dataStore.getSettings());
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(dataStore.getSettings());
      }
    };
    window.addEventListener('eduform_settings_updated', handleUpdate);

    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(target)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);

    return () => {
      window.removeEventListener('eduform_settings_updated', handleUpdate);
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, []);

  const handleSwitchTheme = (themeId: string) => {
    const updated = {
      ...settings,
      themeId,
      updatedAt: new Date().toISOString(),
    };
    dataStore.saveSettings(updated);
    setSettings(updated);
    document.documentElement.setAttribute('data-theme', themeId);
    setThemeDropdownOpen(false);
    const themeObj = getTheme(themeId);
    toast.success(`Theme switched to "${themeObj.name}".`);
  };

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setProfileDropdownOpen(false);
    setSidebarOpen(false);
    try {
      await signOut();
      toast.info('Signed out successfully.');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const adminNavItems: NavItem[] = [
    { label: 'Admin Overview', to: '/admin', icon: Home, end: true },
    { label: 'User Directory', to: '/admin/users', icon: Users },
    { label: 'Classes & Streams', to: '/admin/classes', icon: Layers },
    { label: 'Academic Subjects', to: '/admin/subjects', icon: GraduationCap },
    { label: 'Lesson Notes', to: '/admin/lessons', icon: BookOpen },
    { label: 'Quiz Builder', to: '/admin/quizzes', icon: FileQuestion },
    { label: 'Submissions Queue', to: '/admin/submissions', icon: ClipboardList },
    { label: 'Class Gradebook', to: '/admin/gradebook', icon: Award },
    { label: 'Announcements', to: '/admin/notifications', icon: Bell },
    { label: 'System Settings', to: '/admin/settings', icon: Settings },
  ];

  const teacherNavItems: NavItem[] = [
    { label: 'Teacher Dashboard', to: '/dashboard', icon: Home, end: true },
    { label: 'Lesson Notes', to: '/admin/lessons', icon: BookOpen },
    { label: 'Quiz Builder', to: '/admin/quizzes', icon: FileQuestion },
    { label: 'Submissions Queue', to: '/admin/submissions', icon: ClipboardList },
    { label: 'Class Gradebook', to: '/admin/gradebook', icon: Award },
    { label: 'Announcements', to: '/admin/notifications', icon: Bell },
  ];

  const studentNavItems: NavItem[] = [
    { label: 'Student Dashboard', to: '/dashboard', icon: Home, end: true },
    { label: 'Lesson Library', to: '/lessons', icon: BookOpen },
    { label: 'Assigned Quizzes', to: '/quizzes', icon: FileQuestion },
    { label: 'My Quiz Results', to: '/results', icon: Award },
    { label: 'Notifications', to: '/notifications', icon: Bell },
  ];

  const navItems = isAdmin ? adminNavItems : isTeacher ? teacherNavItems : studentNavItems;

  // Derive current page title
  const currentItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const pageTitle = currentItem?.label || 'EduForm Portal';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-[#0F2A4A] hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <EduFormLogo variant="full" size="sm" />
          <div className="hidden md:flex items-center gap-2 pl-4 ml-4 border-l border-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              {isAdmin ? 'Administration' : 'Student Workspace'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-sm font-bold text-[#0F2A4A]">{pageTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Theme Selector Dropdown */}
          <div ref={themeDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setThemeDropdownOpen(!themeDropdownOpen);
                setProfileDropdownOpen(false);
              }}
              className="p-2 rounded-lg text-slate-600 hover:text-[#0F2A4A] hover:bg-slate-100 transition-colors border border-slate-200/80 flex items-center gap-1.5 cursor-pointer"
              title="Change System Theme"
              aria-label="Change System Theme"
            >
              <Palette className="w-4 h-4 text-emerald-600" />
              <div
                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0 hidden sm:block"
                style={{ backgroundColor: getTheme(settings.themeId).colors.primary }}
              />
            </button>

            {themeDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95"
              >
                <div className="px-3.5 pb-2 mb-1 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F2A4A] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-emerald-600" /> System Themes
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {getTheme(settings.themeId).character}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto px-1 space-y-0.5">
                  {SYSTEM_THEMES.map((t) => {
                    const isSelected = (settings.themeId || 'oxford') === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSwitchTheme(t.id)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 font-bold text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: t.colors.primary }}
                          />
                          <div className="truncate">
                            <span className="block truncate leading-tight">{t.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate leading-tight">
                              {t.character}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {isAdmin && (
                  <div className="pt-2 mt-1 border-t border-slate-100 px-3">
                    <NavLink
                      to="/admin/settings"
                      onClick={() => setThemeDropdownOpen(false)}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-between"
                    >
                      <span>Institutional Theme Studio</span>
                      <span>→</span>
                    </NavLink>
                  </div>
                )}
              </div>
            )}
          </div>

          <NotificationBell />

          {/* Day / Night Mode Toggle */}
          <button
            type="button"
            onClick={toggleMode}
            className={`p-2 rounded-lg transition-all border flex items-center justify-center cursor-pointer ${
              isNight
                ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700 hover:text-amber-300'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isNight ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
            aria-label={isNight ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {isNight ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-180 duration-200" />
            )}
            <span className="sr-only">{isNight ? 'Day Mode' : 'Night Mode'}</span>
          </button>

          {/* User Profile Pill & Dropdown */}
          <div ref={profileDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setThemeDropdownOpen(false);
              }}
              className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 focus:outline-hidden cursor-pointer"
            >
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-[#0F2A4A] leading-tight truncate max-w-[130px]">
                  {profile?.fullName || 'User'}
                </p>
                <p className="text-[10px] text-slate-600 font-medium capitalize">
                  {profile?.role || 'Guest'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0F2A4A] text-white flex items-center justify-center text-xs font-bold ring-2 ring-emerald-500/30">
                {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-[#0F2A4A] truncate">{profile?.fullName}</p>
                  <p className="text-[11px] text-slate-600 font-mono truncate">@{profile?.username}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Account
                  </span>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      toggleMode();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isNight ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Moon className="w-4 h-4 text-slate-500" />
                      )}
                      <span>Display Mode</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-600">
                      {isNight ? 'Night' : 'Day'}
                    </span>
                  </button>

                  {isAdmin && (
                    <NavLink
                      to="/admin/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      Settings
                    </NavLink>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleLogout(e)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Header Sign Out Button */}
          <button
            type="button"
            onClick={(e) => handleLogout(e)}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Sign Out of Account"
            aria-label="Sign Out of Account"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span className="hidden lg:inline text-xs font-semibold text-rose-600">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-[#0F2A4A] text-slate-300 shrink-0">
          <div className="p-4 border-b border-slate-700/60 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isAdmin ? 'Staff Navigation' : 'My Classes & Learning'}
            </span>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Account & Direct Sign Out in Sidebar Footer */}
          <div className="p-3 border-t border-slate-700/60 bg-[#0B213B]/80 space-y-2.5">
            <div className="flex items-center gap-2.5 px-1 py-1">
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {profile?.fullName || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium capitalize truncate">
                  {profile?.role || 'Guest'} • @{profile?.username}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => handleLogout(e)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer shadow-2xs"
              title="Sign Out of Account"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>

            <div className="pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 flex items-center justify-between px-1">
              <span className="truncate">{settings.appName || 'EduForm'}</span>
              <span className="shrink-0 text-slate-500">{settings.academicTermLabel || '2026/2027'}</span>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Backdrop & Drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-xs flex"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="w-72 max-w-xs bg-[#0F2A4A] text-slate-300 flex flex-col h-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <EduFormLogo variant="inverted" size="sm" />
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-emerald-500 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={(e) => handleLogout(e)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600 hover:text-white cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Primary Page Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

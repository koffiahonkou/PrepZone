import React, { useState, useRef } from 'react';
import {
  Settings,
  Shield,
  Award,
  Calendar,
  Building,
  Save,
  RefreshCw,
  Download,
  AlertTriangle,
  History,
  CheckCircle2,
  Lock,
  Upload,
  Image as ImageIcon,
  Globe,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Trash2,
  Eye,
  UserCheck,
  Check,
  Palette,
  Sun,
  Moon,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { SystemSettings, AuditLog } from '@/src/types';
import { useAuth } from '@/src/context/AuthContext';
import { useColorMode } from '@/src/context/ColorModeContext';
import { EduFormLogo } from '@/src/components/brand/EduFormLogo';
import { SYSTEM_THEMES, getTheme } from '@/src/lib/themes';
import { toast } from 'sonner';

export const AdminSettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const { mode, isNight, setMode } = useColorMode();
  const [settings, setSettings] = useState<SystemSettings>(() => dataStore.getSettings());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => dataStore.getAuditLogs());

  // System Information Form State
  const [appName, setAppName] = useState(settings.appName || 'EduForm');
  const [tagline, setTagline] = useState(settings.tagline || 'School Assessment System');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [logoTheme, setLogoTheme] = useState(settings.logoTheme || 'shield');
  const [selectedThemeId, setSelectedThemeId] = useState<string>(settings.themeId || 'oxford');
  const [schoolAddress, setSchoolAddress] = useState(settings.schoolAddress || '');
  const [contactEmail, setContactEmail] = useState(settings.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(settings.contactPhone || '');
  const [schoolWebsite, setSchoolWebsite] = useState(settings.schoolWebsite || '');
  const [principalOrHead, setPrincipalOrHead] = useState(settings.principalOrHead || '');

  // Academic & Grading Form State
  const [academicTermLabel, setAcademicTermLabel] = useState(
    settings.academicTermLabel || '2026/2027 Term 1'
  );
  const [passMarkPercent, setPassMarkPercent] = useState(
    settings.defaultPassMarkPercent ?? 50
  );

  const [activeTab, setActiveTab] = useState<'general' | 'themes' | 'grading' | 'security' | 'audit'>('general');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [logoSourceMode, setLogoSourceMode] = useState<'upload' | 'url' | 'theme'>('upload');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleApplyTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    const updated: SystemSettings = {
      ...settings,
      themeId,
      updatedAt: new Date().toISOString(),
    };
    dataStore.saveSettings(updated);
    setSettings(updated);
    document.documentElement.setAttribute('data-theme', themeId);

    // Audit log event
    dataStore.addAuditLog({
      actorId: profile?.uid || 'admin',
      action: 'THEME_ACTIVATED',
      targetType: 'system',
      targetId: 'theme',
      meta: {
        previousTheme: settings.themeId || 'oxford',
        activatedTheme: themeId,
      },
    });

    setAuditLogs(dataStore.getAuditLogs());
    const themeObj = getTheme(themeId);
    toast.success(`Theme "${themeObj.name}" applied and activated system-wide!`);
  };

  const handlePreviewTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    const themeObj = getTheme(themeId);
    toast.info(`Live previewing "${themeObj.name}". Click "Activate Theme" to save.`);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
        toast.success(`Logo image loaded: ${file.name}`);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read logo image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearCustomLogo = () => {
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Custom logo cleared. System will use the selected vector crest theme.');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      toast.error('School / App name cannot be empty.');
      return;
    }

    const updated: SystemSettings = {
      ...settings,
      appName: appName.trim(),
      tagline: tagline.trim() || 'School Assessment System',
      logoUrl: logoUrl.trim() || undefined,
      logoTheme: logoTheme,
      themeId: selectedThemeId,
      schoolAddress: schoolAddress.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      schoolWebsite: schoolWebsite.trim(),
      principalOrHead: principalOrHead.trim(),
      academicTermLabel: academicTermLabel.trim(),
      defaultPassMarkPercent: Number(passMarkPercent),
      updatedAt: new Date().toISOString(),
    };

    dataStore.saveSettings(updated);
    setSettings(updated);

    // Record audit log
    dataStore.addAuditLog({
      actorId: profile?.uid || 'admin',
      action: 'SYSTEM_INFO_UPDATED',
      targetType: 'system',
      targetId: 'global',
      meta: {
        appName: updated.appName,
        tagline: updated.tagline,
        hasCustomLogo: Boolean(updated.logoUrl),
        logoTheme: updated.logoTheme,
        academicTermLabel: updated.academicTermLabel,
        defaultPassMarkPercent: updated.defaultPassMarkPercent,
      },
    });

    setAuditLogs(dataStore.getAuditLogs());
    toast.success('System information and branding saved successfully!');
  };

  const handleExportData = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      settings: dataStore.getSettings(),
      users: dataStore.getUsers(),
      classes: dataStore.getClasses(),
      levels: dataStore.getLevels(),
      subjects: dataStore.getSubjects(),
      lessons: dataStore.getLessons(),
      quizzes: dataStore.getQuizzes(),
      submissions: dataStore.getSubmissions(),
      notifications: dataStore.getNotifications(),
      auditLogs: dataStore.getAuditLogs(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${(appName || 'EduForm').replace(/\s+/g, '_')}_Backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('System data exported successfully.');
  };

  const confirmFactoryReset = () => {
    dataStore.resetToSampleData();
    const fresh = dataStore.getSettings();
    setSettings(fresh);
    setAuditLogs(dataStore.getAuditLogs());
    setAppName(fresh.appName);
    setTagline(fresh.tagline || 'School Assessment System');
    setLogoUrl(fresh.logoUrl || '');
    setLogoTheme(fresh.logoTheme || 'shield');
    setSchoolAddress(fresh.schoolAddress || '');
    setContactEmail(fresh.contactEmail || '');
    setContactPhone(fresh.contactPhone || '');
    setSchoolWebsite(fresh.schoolWebsite || '');
    setPrincipalOrHead(fresh.principalOrHead || '');
    setAcademicTermLabel(fresh.academicTermLabel);
    setPassMarkPercent(fresh.defaultPassMarkPercent);
    setShowResetConfirm(false);
    toast.info('Factory defaults restored.');
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" /> System & School Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure institutional identity, academic thresholds, grading policies, and system audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Backup JSON
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-rose-700 shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'general'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" /> School Identity
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('themes')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'themes'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" /> Visual Themes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('grading')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'grading'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" /> Grading & Pass Marks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" /> Security & Auth
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" /> Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: General School & System Identity */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-8">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F2A4A] flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" /> System Information & Institutional Identity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize the platform name, emblem/logo, institutional tagline, academic term, and school contact details.
              </p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save System Information
            </button>
          </div>

          {/* Section 1: Name and Tagline */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              1. Platform Branding & Title
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  School / Platform Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white font-medium text-slate-800"
                  placeholder="e.g. EduForm or St. Jude International School"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Displayed on top navigation bars, page titles, login panel, and system communications.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  System Tagline / Motto
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white text-slate-800"
                  placeholder="e.g. School Assessment System or Excellence in Character & Learning"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Subtitle displayed under the institution name on headers and authentication screens.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Logo & Crest Management */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  2. Institutional Logo & Crest
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload an emblem file, enter an image URL, or choose one of our four institutional vector crests.
                </p>
              </div>

              {logoUrl && (
                <button
                  type="button"
                  onClick={handleClearCustomLogo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Revert to Default Vector Crest
                </button>
              )}
            </div>

            {/* Logo Mode Switcher */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLogoSourceMode('upload')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  logoSourceMode === 'upload'
                    ? 'bg-[#0F2A4A] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload File (PNG/JPG/SVG)
              </button>
              <button
                type="button"
                onClick={() => setLogoSourceMode('url')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  logoSourceMode === 'url'
                    ? 'bg-[#0F2A4A] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Image Web Link
              </button>
              <button
                type="button"
                onClick={() => setLogoSourceMode('theme')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  logoSourceMode === 'theme'
                    ? 'bg-[#0F2A4A] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Built-in Vector Crests
              </button>
            </div>

            {/* Logo Mode 1: File Upload */}
            {logoSourceMode === 'upload' && (
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                  id="logo-file-picker"
                />
                <label
                  htmlFor="logo-file-picker"
                  className="flex flex-col items-center justify-center cursor-pointer py-4"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Click to select logo file from your device
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Supports PNG, JPG, SVG, WebP (Max 2MB). Transparent background recommended.
                  </span>
                </label>
              </div>
            )}

            {/* Logo Mode 2: Direct Image URL */}
            {logoSourceMode === 'url' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  Logo Image Web URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/school-logo.png"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white font-mono text-xs"
                    />
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Paste a direct link to your school logo image hosted on the web.
                </span>
              </div>
            )}

            {/* Logo Mode 3: Vector Crest Themes */}
            {logoSourceMode === 'theme' && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-2">
                  Select Preset Vector Crest Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'shield', name: 'Shield & Torch', desc: 'Academic excellence and integrity' },
                    { id: 'classical', name: 'Classical Lyceum', desc: 'Traditional university laurel' },
                    { id: 'modern', name: 'Modern STEM', desc: 'Geometric science hexagon' },
                    { id: 'book', name: 'Open Book & Sun', desc: 'Enlightenment and literature' },
                  ].map((theme) => (
                    <div
                      key={theme.id}
                      onClick={() => {
                        setLogoTheme(theme.id);
                        if (logoUrl) {
                          setLogoUrl('');
                        }
                      }}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                        logoTheme === theme.id && !logoUrl
                          ? 'border-[#0F2A4A] bg-emerald-50/30 ring-2 ring-[#0F2A4A]'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-[#0F2A4A]">{theme.name}</span>
                          {logoTheme === theme.id && !logoUrl && (
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block leading-snug">{theme.desc}</span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-center">
                        <EduFormLogo
                          variant="mark"
                          size="md"
                          customLogoTheme={theme.id}
                          customLogoUrl=""
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Real-time Branding Preview */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" /> Real-time Branding Live Preview
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {logoUrl ? 'Using Custom Uploaded Logo' : `Using ${logoTheme} Crest`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Light preview (Header Bar) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                    Header & Navigation Style (Light)
                  </span>
                  <div className="h-14 flex items-center px-4 bg-slate-50/70 border border-slate-200/60 rounded-lg">
                    <EduFormLogo
                      variant="full"
                      size="sm"
                      customName={appName}
                      customLogoUrl={logoUrl}
                      customLogoTheme={logoTheme}
                      customTagline={tagline}
                    />
                  </div>
                </div>

                {/* Dark preview (Login & Sidebar) */}
                <div className="p-4 rounded-xl border border-slate-700 bg-[#0F2A4A] text-white shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                    Sidebar & Login Portal Style (Dark)
                  </span>
                  <div className="h-14 flex items-center px-4 bg-[#14365d] border border-slate-700/60 rounded-lg">
                    <EduFormLogo
                      variant="inverted"
                      size="sm"
                      customName={appName}
                      customLogoUrl={logoUrl}
                      customLogoTheme={logoTheme}
                      customTagline={tagline}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Institutional Contact & Location */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" /> 3. Institutional Contact & Campus Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Campus Physical Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="100 University Boulevard, Academic City"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Head of School / Principal
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={principalOrHead}
                    onChange={(e) => setPrincipalOrHead(e.target.value)}
                    placeholder="Dr. Evelyn Reed (Head of Academics)"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Administrative Contact Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="admin@eduform.local"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                  Official School Website
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="url"
                    value={schoolWebsite}
                    onChange={(e) => setSchoolWebsite(e.target.value)}
                    placeholder="https://eduform.local"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Academic Session */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" /> 4. Academic Session & Calendar Cycle
            </h4>
            <div className="max-w-md">
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                Current Academic Session & Term Label <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={academicTermLabel}
                onChange={(e) => setAcademicTermLabel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-white text-slate-800"
                placeholder="2026/2027 Term 1"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default term cycle applied to newly authored assessments and report cards.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Last saved: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('themes')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" /> Institutional Theme: {getTheme(selectedThemeId).name} →
              </button>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save System Information
            </button>
          </div>
        </form>
      )}

      {/* Tab: Visual Themes */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#0F2A4A] flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-600" /> Institutional Aesthetic Themes
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Choose a visual personality for your school. Selecting a theme immediately recalibrates all headers, navigation sidebars, action buttons, assessment cards, and authentication portals across all user roles.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Active System Theme
                </span>
                <span className="text-xs font-bold text-[#0F2A4A]">
                  {getTheme(settings.themeId).name}
                </span>
              </div>
              <div
                className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                style={{ backgroundColor: getTheme(settings.themeId).colors.primary }}
              />
            </div>
          </div>

          {/* Day & Night Mode Selection Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {isNight ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  Display Mode: Day Mode vs Night Mode
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose between high-contrast daylight mode or eye-comfortable midnight dark mode across all student and staff portals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('day');
                    toast.success('Day Mode activated.');
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    !isNight
                      ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/30 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Day Mode (Light)</span>
                  {!isNight && <Check className="w-3.5 h-3.5 text-amber-600 ml-1" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('night');
                    toast.success('Night Mode activated.');
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isNight
                      ? 'bg-slate-900 text-indigo-200 border-indigo-500 ring-2 ring-indigo-500/30 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Night Mode (Dark)</span>
                  {isNight && <Check className="w-3.5 h-3.5 text-indigo-400 ml-1" />}
                </button>
              </div>
            </div>
          </div>

          {/* Themes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SYSTEM_THEMES.map((theme) => {
              const isCurrent = (settings.themeId || 'oxford') === theme.id;
              const isPreviewing = selectedThemeId === theme.id;

              return (
                <div
                  key={theme.id}
                  className={`bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xs ${
                    isCurrent
                      ? 'border-[#0F2A4A] ring-2 ring-[#0F2A4A] bg-emerald-50/10'
                      : isPreviewing
                      ? 'border-emerald-500 ring-1 ring-emerald-500'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{theme.name}</h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{theme.subname}</p>
                      </div>

                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {theme.character}
                      </span>
                    </div>

                    {/* Color Swatch Bar */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div
                          className="w-6 h-6 rounded-md shadow-2xs border border-black/10 shrink-0"
                          style={{ backgroundColor: theme.colors.primary }}
                          title={`Primary: ${theme.colors.primary}`}
                        />
                        <div
                          className="w-6 h-6 rounded-md shadow-2xs border border-black/10 shrink-0"
                          style={{ backgroundColor: theme.colors.accent }}
                          title={`Accent: ${theme.colors.accent}`}
                        />
                        <div
                          className="w-6 h-6 rounded-md shadow-2xs border border-black/10 shrink-0"
                          style={{ backgroundColor: theme.colors.sidebarBg }}
                          title={`Sidebar: ${theme.colors.sidebarBg}`}
                        />
                        <div
                          className="w-6 h-6 rounded-md shadow-2xs border border-black/10 shrink-0"
                          style={{ backgroundColor: theme.colors.pageBg }}
                          title={`Canvas: ${theme.colors.pageBg}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {theme.colors.primary}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed min-h-[3.5rem]">
                      {theme.description}
                    </p>

                    {/* Mini UI Simulation Box */}
                    <div
                      className="rounded-lg p-3 border text-left text-xs space-y-2 shadow-2xs select-none"
                      style={{
                        backgroundColor: theme.colors.pageBg,
                        borderColor: '#e2e8f0',
                      }}
                    >
                      {/* Mini simulated topbar */}
                      <div
                        className="h-6 rounded px-2 flex items-center justify-between text-white text-[10px] font-semibold"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        <span className="truncate">{appName || 'EduForm'}</span>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                      </div>

                      {/* Mini simulated quiz card */}
                      <div
                        className="p-2.5 rounded-md border border-slate-200/80 shadow-2xs space-y-1.5"
                        style={{ backgroundColor: theme.colors.cardBg }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: theme.colors.badgeBg,
                              color: theme.colors.badgeText,
                            }}
                          >
                            Term Assessment
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">10 Questions</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">
                          Molecular Genetics & Cellular Biology
                        </p>
                        <div className="pt-1 flex justify-end">
                          <div
                            className="px-2 py-0.5 rounded text-[9px] font-semibold text-white cursor-default"
                            style={{ backgroundColor: theme.colors.primary }}
                          >
                            Start Assessment
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreviewTheme(theme.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isPreviewing ? 'Previewing' : 'Live Preview'}</span>
                    </button>

                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> Current Theme
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyTheme(theme.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Activate Theme</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Instant Global Reactivity</span>
              <p className="text-emerald-800 mt-0.5">
                Theme changes take effect instantly across all classrooms, student dashboards, quiz builder screens, and mobile views. The theme configuration is stored in institutional settings and recorded in the audit trail.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Grading Policies */}
      {activeTab === 'grading' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#0F2A4A]">Grading Standards & Thresholds</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure the minimum passing grade percentage and answer reveal policies for school tests.
            </p>
          </div>

          <div className="max-w-xl space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase text-slate-700">
                  Default Pass Mark Percentage
                </label>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {passMarkPercent}%
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={80}
                step={5}
                value={passMarkPercent}
                onChange={(e) => setPassMarkPercent(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>30% (Lenient)</span>
                <span>50% (Standard)</span>
                <span>80% (Honors)</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Immediate Auto-Graded Feedback</span>
                  <p className="text-slate-500 mt-0.5">
                    Students receive instant pass/fail evaluation on objective questions (single choice, multiple select, true/false, short text).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Explanations & Model Keys Visible by Default</span>
                  <p className="text-slate-500 mt-0.5">
                    Per school requirement, model answers and explanations are immediately accessible to students after submission.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" /> Save Grading Policies
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Security & Auth */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#0F2A4A]">Authentication Architecture & RBAC</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review institutional account isolation, synthetic email mapping, and username locks.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl text-xs">
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Synthetic Email Provider Domain</span>
                <p className="text-slate-600 mt-0.5 font-mono">
                  AUTH_DOMAIN = "eduform.local"
                </p>
                <p className="text-slate-500 mt-1">
                  Students and teachers log in using simple usernames without public email harvesting. The system normalizes usernames to <code>username@eduform.local</code> internally.
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Secondary Firebase App Factory</span>
                <p className="text-slate-500 mt-0.5">
                  When administrators provision new faculty or student accounts, user creation executes via an isolated secondary Firebase instance (<code>admin-secondary</code>) to prevent signing out the active admin session.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Account Deactivation Safeguards</span>
                <p className="text-slate-500 mt-0.5">
                  When a user account status is set to <code>inactive</code>, any active session is immediately revoked with an alert to contact the school administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-[#0F2A4A] flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" /> Administrative Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Append-only record of system events, user creation, quiz publishing, and policy edits
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Target Type</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 capitalize">
                      {log.targetType}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {log.actorId}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {JSON.stringify(log.meta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Defaults Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A]">Reset to Factory Defaults?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              This will restore all classes, subjects, sample quizzes, lesson notes, and users to their original demo state. Any custom additions will be reset.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmFactoryReset}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

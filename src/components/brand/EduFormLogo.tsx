import React, { useState, useEffect } from 'react';
import { dataStore } from '@/src/services/dataStore';
import { SystemSettings } from '@/src/types';

interface EduFormLogoProps {
  className?: string;
  variant?: 'full' | 'mark' | 'inverted';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customName?: string;
  customLogoUrl?: string;
  customLogoTheme?: string;
  customTagline?: string;
}

export const EduFormLogo: React.FC<EduFormLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  customName,
  customLogoUrl,
  customLogoTheme,
  customTagline,
}) => {
  const [settings, setSettings] = useState<SystemSettings>(() => dataStore.getSettings());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SystemSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(dataStore.getSettings());
      }
    };

    window.addEventListener('eduform_settings_updated', handleUpdate);
    return () => window.removeEventListener('eduform_settings_updated', handleUpdate);
  }, []);

  const appName = customName !== undefined ? customName : (settings.appName || 'EduForm');
  const logoUrl = customLogoUrl !== undefined ? customLogoUrl : settings.logoUrl;
  const logoTheme = customLogoTheme !== undefined ? customLogoTheme : (settings.logoTheme || 'shield');
  const tagline = customTagline !== undefined ? customTagline : (settings.tagline || 'School Assessment System');

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const isDark = variant === 'inverted';

  // Render vector crest based on selected theme
  const renderCrest = () => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={appName}
          className="w-full h-full object-contain rounded-lg"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }

    if (logoTheme === 'classical') {
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Classical Laurel & Column */}
          <rect width="48" height="48" rx="10" fill="var(--brand-primary, #0F2A4A)" />
          <path d="M14 36H34M17 33H31M19 15V30M24 15V30M29 15V30M16 15H32M14 12H34" stroke="var(--brand-accent, #10B981)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="8.5" r="2" fill="#FFFFFF" />
        </svg>
      );
    }

    if (logoTheme === 'modern') {
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Modern STEM Hexagon */}
          <path d="M24 4L41 14V34L24 44L7 34V14L24 4Z" fill="var(--brand-primary, #0F2A4A)" stroke="var(--brand-accent, #10B981)" strokeWidth="2" />
          <circle cx="24" cy="24" r="5" fill="var(--brand-accent, #10B981)" />
          <ellipse cx="24" cy="24" rx="13" ry="5.5" stroke="#FFFFFF" strokeWidth="1.5" transform="rotate(-30 24 24)" />
          <ellipse cx="24" cy="24" rx="13" ry="5.5" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" transform="rotate(30 24 24)" />
        </svg>
      );
    }

    if (logoTheme === 'book') {
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Open Book & Sun */}
          <rect width="48" height="48" rx="10" fill="var(--brand-primary, #0F2A4A)" />
          <circle cx="24" cy="14" r="5" fill="var(--brand-accent, #10B981)" />
          <path d="M12 34C16 31 20 31 24 33C28 31 32 31 36 34V22C32 19 28 19 24 21C20 19 16 19 12 22V34Z" fill="#FFFFFF" />
          <path d="M24 21V33" stroke="var(--brand-accent, #10B981)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }

    // Default 'shield' (Academic Shield & Torch)
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path
          d="M24 4L7 10V22C7 33.2 14.3 43.1 24 46C33.7 43.1 41 33.2 41 22V10L24 4Z"
          fill="var(--brand-primary, #0F2A4A)"
        />
        <path
          d="M24 7L10 12V22C10 31.4 16 39.8 24 42.5C32 39.8 38 31.4 38 22V12L24 7Z"
          stroke="var(--brand-accent, #10B981)"
          strokeWidth="1.5"
          strokeOpacity="0.85"
          fill="none"
        />
        <path
          d="M16 26C18.5 24.5 21.5 24.5 24 26C26.5 24.5 29.5 24.5 32 26V17C29.5 15.5 26.5 15.5 24 17C21.5 15.5 18.5 15.5 16 17V26Z"
          fill="#FFFFFF"
          fillOpacity="0.95"
        />
        <path
          d="M24 14V33"
          stroke="var(--brand-accent, #10B981)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="24" cy="11.5" r="1.75" fill="var(--brand-accent, #10B981)" />
      </svg>
    );
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Institutional Crest / Custom Logo */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center shrink-0 rounded-xl shadow-xs transition-transform duration-200 overflow-hidden`}
      >
        {renderCrest()}
      </div>

      {variant !== 'mark' && (
        <div className="flex flex-col leading-tight min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            {appName.toLowerCase() === 'eduform' ? (
              <span
                className={`font-black tracking-tight font-serif ${textSizes[size]} ${
                  isDark ? 'text-white' : 'text-[#0F2A4A]'
                }`}
              >
                Edu<span className="text-emerald-500 font-sans">Form</span>
              </span>
            ) : (
              <span
                className={`font-black tracking-tight font-serif truncate ${textSizes[size]} ${
                  isDark ? 'text-white' : 'text-[#0F2A4A]'
                }`}
              >
                {appName}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] tracking-widest uppercase font-semibold truncate ${
              isDark ? 'text-emerald-300/80' : 'text-slate-600'
            }`}
          >
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
};

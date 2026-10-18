export interface AppTheme {
  id: string;
  name: string;
  subname: string;
  character: string;
  description: string;
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    accent: string;
    accentHover: string;
    accentLight: string;
    accentText: string;
    sidebarBg: string;
    sidebarText: string;
    sidebarActive: string;
    pageBg: string;
    cardBg: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    headingText: string;
  };
  previewPalette: string[];
}

export const SYSTEM_THEMES: AppTheme[] = [
  {
    id: 'oxford',
    name: 'Collegiate Oxford',
    subname: 'Academic Navy & Scholar Emerald',
    character: 'Traditional Collegiate',
    description: 'Deep navy foundations with crisp emerald highlights. The quintessential collegiate aesthetic designed for classical rigor and clarity.',
    colors: {
      primary: '#0F2A4A',
      primaryHover: '#163c68',
      primaryLight: '#f0f4f9',
      accent: '#10B981',
      accentHover: '#059669',
      accentLight: '#ecfdf5',
      accentText: '#065f46',
      sidebarBg: '#0F2A4A',
      sidebarText: '#e2e8f0',
      sidebarActive: '#163c68',
      pageBg: '#f8fafc',
      cardBg: '#ffffff',
      badgeBg: '#ecfdf5',
      badgeText: '#065f46',
      badgeBorder: '#a7f3d0',
      headingText: '#0F2A4A',
    },
    previewPalette: ['#0F2A4A', '#10B981', '#ffffff', '#f8fafc'],
  },
  {
    id: 'cambridge',
    name: 'Cambridge Sapphire',
    subname: 'Royal Sapphire & Scholarly Amber',
    character: 'Ivy League Prestige',
    description: 'Regal sapphire blue contrasted against warm scholarly amber and gold accents, evoking ceremonial academic excellence.',
    colors: {
      primary: '#1E3A8A',
      primaryHover: '#1d4ed8',
      primaryLight: '#eff6ff',
      accent: '#D97706',
      accentHover: '#b45309',
      accentLight: '#fffbeb',
      accentText: '#92400e',
      sidebarBg: '#1E3A8A',
      sidebarText: '#e0e7ff',
      sidebarActive: '#2563eb',
      pageBg: '#f8fafc',
      cardBg: '#ffffff',
      badgeBg: '#fffbeb',
      badgeText: '#92400e',
      badgeBorder: '#fde68a',
      headingText: '#1E3A8A',
    },
    previewPalette: ['#1E3A8A', '#D97706', '#ffffff', '#eff6ff'],
  },
  {
    id: 'crimson',
    name: 'Harvard Crimson',
    subname: 'Heritage Crimson & Warm Rose',
    character: 'Humanities & Heritage',
    description: 'Distinguished burgundy crimson paired with warm rose sandstone highlights. Perfect for humanities, law, and liberal arts.',
    colors: {
      primary: '#881337',
      primaryHover: '#9f1239',
      primaryLight: '#fff1f2',
      accent: '#E11D48',
      accentHover: '#be123c',
      accentLight: '#ffe4e6',
      accentText: '#9f1239',
      sidebarBg: '#4C0519',
      sidebarText: '#fecdd3',
      sidebarActive: '#881337',
      pageBg: '#fff5f5',
      cardBg: '#ffffff',
      badgeBg: '#fff1f2',
      badgeText: '#9f1239',
      badgeBorder: '#fecdd3',
      headingText: '#881337',
    },
    previewPalette: ['#881337', '#E11D48', '#ffffff', '#fff5f5'],
  },
  {
    id: 'nordic',
    name: 'Nordic Spruce & Teal',
    subname: 'Arctic Pine & Coastal Seafoam',
    character: 'Modern STEM & Architecture',
    description: 'Deep spruce green and vibrant seafoam teal on an airy, minimalist background. Clean, refreshing, and calming during intensive exams.',
    colors: {
      primary: '#134E4A',
      primaryHover: '#115E59',
      primaryLight: '#f0fdfa',
      accent: '#0D9488',
      accentHover: '#0f766e',
      accentLight: '#ccfbf1',
      accentText: '#115e59',
      sidebarBg: '#134E4A',
      sidebarText: '#ccfbf1',
      sidebarActive: '#115e59',
      pageBg: '#f4fbfb',
      cardBg: '#ffffff',
      badgeBg: '#f0fdfa',
      badgeText: '#115e59',
      badgeBorder: '#99f6e4',
      headingText: '#134E4A',
    },
    previewPalette: ['#134E4A', '#0D9488', '#ffffff', '#f4fbfb'],
  },
  {
    id: 'amethyst',
    name: 'Royal Amethyst',
    subname: 'Imperial Violet & Electric Indigo',
    character: 'Creative Arts & Innovation',
    description: 'Majestic deep violet paired with luminous indigo accents. Inspiring creative thought, design exploration, and honors symposiums.',
    colors: {
      primary: '#4C1D95',
      primaryHover: '#5B21B6',
      primaryLight: '#f5f3ff',
      accent: '#6366F1',
      accentHover: '#4f46e5',
      accentLight: '#e0e7ff',
      accentText: '#4338ca',
      sidebarBg: '#3B0764',
      sidebarText: '#e9d5ff',
      sidebarActive: '#4C1D95',
      pageBg: '#f9f8fe',
      cardBg: '#ffffff',
      badgeBg: '#f5f3ff',
      badgeText: '#4338ca',
      badgeBorder: '#c4b5fd',
      headingText: '#4C1D95',
    },
    previewPalette: ['#4C1D95', '#6366F1', '#ffffff', '#f9f8fe'],
  },
  {
    id: 'slate',
    name: 'Architectural Charcoal',
    subname: 'Obsidian Slate & Warm Bronze',
    character: 'Minimalist Engineering',
    description: 'High-contrast monochrome charcoal with refined warm bronze details. Clean, geometric, and engineered for laser focus.',
    colors: {
      primary: '#18181B',
      primaryHover: '#27272a',
      primaryLight: '#f4f4f5',
      accent: '#B45309',
      accentHover: '#92400e',
      accentLight: '#fef3c7',
      accentText: '#92400e',
      sidebarBg: '#18181B',
      sidebarText: '#e4e4e7',
      sidebarActive: '#27272a',
      pageBg: '#fafafa',
      cardBg: '#ffffff',
      badgeBg: '#fef3c7',
      badgeText: '#92400e',
      badgeBorder: '#fde68a',
      headingText: '#18181B',
    },
    previewPalette: ['#18181B', '#B45309', '#ffffff', '#fafafa'],
  },
  {
    id: 'obsidian',
    name: 'Neo-Scholastic Dark',
    subname: 'Deep Midnight & Electric Cyan',
    character: 'Full Dark Mode Studio',
    description: 'An immersive night-mode palette built with deep slate surfaces and luminous electric cyan accents, designed for night grading and lab sessions.',
    colors: {
      primary: '#38BDF8',
      primaryHover: '#0284c7',
      primaryLight: '#0f172a',
      accent: '#06B6D4',
      accentHover: '#0891b2',
      accentLight: '#164e63',
      accentText: '#67e8f9',
      sidebarBg: '#090D16',
      sidebarText: '#94a3b8',
      sidebarActive: '#1e293b',
      pageBg: '#0B1120',
      cardBg: '#111827',
      badgeBg: '#164e63',
      badgeText: '#67e8f9',
      badgeBorder: '#0e7490',
      headingText: '#F8FAFC',
    },
    previewPalette: ['#090D16', '#38BDF8', '#111827', '#0B1120'],
  },
];

export function getTheme(themeId?: string): AppTheme {
  const found = SYSTEM_THEMES.find((t) => t.id === themeId);
  return found || SYSTEM_THEMES[0];
}

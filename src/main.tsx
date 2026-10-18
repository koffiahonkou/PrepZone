import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { dataStore } from './services/dataStore';

try {
  const initialTheme = dataStore.getSettings().themeId || 'oxford';
  document.documentElement.setAttribute('data-theme', initialTheme);

  const initialMode = localStorage.getItem('eduform_color_mode');
  if (initialMode === 'night' || (!initialMode && window.matchMedia?.('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-mode', 'night');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-mode', 'day');
  }
} catch {
  document.documentElement.setAttribute('data-theme', 'oxford');
}

createRoot(document.getElementById('root')!).render(<App />);


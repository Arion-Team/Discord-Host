import { create } from 'zustand';
import api from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  planId: string | null;
  storageUsedMb: number;
  suspended: boolean;
  emailVerified: boolean;
  discordId: string | null;
  discordTag: string | null;
  discordAvatar: string | null;
  discordBanner: string | null;
  discordDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingSettings {
  siteName: string;
  logo: string;
  favicon: string;
  backgroundImage: string;
  bgColor: string;
  bgGradient: string;
  primaryColor: string;
  accentColor: string;
  theme: 'dark' | 'light';
  loginSubtitle: string;
  registrationEnabled: boolean;
  footerText: string;
  supportUrl: string;
  seoTitle: string;
  seoDescription: string;
  announcementText: string;
  announcementEnabled: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  logout: async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // ignore
    }
    set({ user: null });
  },
}));

interface BrandingState {
  settings: BrandingSettings;
  fetchBranding: () => Promise<void>;
  applyTheme: (settings: Partial<BrandingSettings>) => void;
}

const defaultBranding: BrandingSettings = {
  siteName: 'DiscordHost',
  logo: '',
  favicon: '',
  backgroundImage: '',
  bgColor: '#020617',
  bgGradient: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #0a111c 100%)',
  primaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  theme: 'dark',
  loginSubtitle: 'Professional Discord Bot Hosting',
  registrationEnabled: true,
  footerText: 'DiscordHost',
  supportUrl: '',
  seoTitle: 'DiscordHost - Discord Bot Hosting',
  seoDescription: 'Professional Discord bot hosting platform',
  announcementText: '',
  announcementEnabled: false,
};

export const useBrandingStore = create<BrandingState>((set, get) => ({
  settings: defaultBranding,
  fetchBranding: async () => {
    try {
      const data = await api.get('/branding');
      const raw = data.settings || data;
      const settings: BrandingSettings = {
        siteName: raw.siteName ?? defaultBranding.siteName,
        logo: raw.siteLogo ?? raw.logo ?? defaultBranding.logo,
        favicon: raw.favicon ?? defaultBranding.favicon,
        backgroundImage: raw.backgroundImage ?? defaultBranding.backgroundImage,
        bgColor: raw.bgColor ?? defaultBranding.bgColor,
        bgGradient: raw.bgGradient ?? defaultBranding.bgGradient,
        primaryColor: raw.primaryColor ?? defaultBranding.primaryColor,
        accentColor: raw.accentColor ?? defaultBranding.accentColor,
        theme: raw.theme ?? defaultBranding.theme,
        loginSubtitle: raw.loginSubtitle ?? defaultBranding.loginSubtitle,
        registrationEnabled: raw.registrationEnabled === 'true' || raw.registrationEnabled === true,
        footerText: raw.footerText ?? defaultBranding.footerText,
        supportUrl: raw.supportUrl ?? defaultBranding.supportUrl,
        seoTitle: raw.seoTitle ?? defaultBranding.seoTitle,
        seoDescription: raw.seoDescription ?? defaultBranding.seoDescription,
        announcementText: raw.announcementBanner ?? raw.announcementText ?? defaultBranding.announcementText,
        announcementEnabled: raw.announcementEnabled === 'true' || raw.announcementEnabled === true,
      };
      set({ settings });
      get().applyTheme(settings);
    } catch {
      set({ settings: defaultBranding });
    }
  },
  applyTheme: (partial) => {
    const s = { ...get().settings, ...partial };
    const root = document.documentElement;

    root.style.setProperty('--brand-50', s.primaryColor);
    root.style.setProperty('--accent-color', s.accentColor);
    root.style.setProperty('--bg-color', s.bgColor);
    root.style.setProperty('--bg-gradient', s.bgGradient);

    if (s.favicon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = s.favicon;
    }

    if (s.theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }

    if (s.backgroundImage) {
      root.style.setProperty('--bg-image', `url(${s.backgroundImage})`);
    }

    document.title = s.seoTitle || s.siteName || 'DiscordHost';
  },
}));

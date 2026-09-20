import React, { useState, useEffect } from 'react';
import {
  Palette,
  Save,
  RefreshCw,
  AlertTriangle,
  Eye,
  Image,
  Type,
  Megaphone,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import api from '../../lib/api';
import { useBrandingStore } from '../../lib/store';

interface BrandingState {
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
  footerText: string;
  supportUrl: string;
  seoTitle: string;
  seoDescription: string;
  announcementText: string;
  announcementEnabled: boolean;
  registrationEnabled: boolean;
}

const defaultBranding: BrandingState = {
  siteName: 'DiscordHost',
  logo: '',
  favicon: '',
  backgroundImage: '',
  bgColor: '#0f0f23',
  bgGradient: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)',
  primaryColor: '#5865F2',
  accentColor: '#57F287',
  theme: 'dark',
  loginSubtitle: 'Host your Discord bots with ease',
  footerText: '© 2026 DiscordHost. All rights reserved.',
  supportUrl: '',
  seoTitle: 'DiscordHost - Discord Bot Hosting',
  seoDescription: 'Professional Discord bot hosting platform',
  announcementText: '',
  announcementEnabled: false,
  registrationEnabled: true,
};

const AdminBrandingPage: React.FC = () => {
  const { settings, applyTheme } = useBrandingStore();
  const [form, setForm] = useState<BrandingState>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchBranding = async () => {
      setLoading(true);
      try {
        const data = await api.get('/branding');
        const s = data.settings || data;
        setForm({
          siteName: s.siteName ?? defaultBranding.siteName,
          logo: s.logo ?? defaultBranding.logo,
          favicon: s.favicon ?? defaultBranding.favicon,
          backgroundImage: s.backgroundImage ?? defaultBranding.backgroundImage,
          bgColor: s.bgColor ?? defaultBranding.bgColor,
          bgGradient: s.bgGradient ?? defaultBranding.bgGradient,
          primaryColor: s.primaryColor ?? defaultBranding.primaryColor,
          accentColor: s.accentColor ?? defaultBranding.accentColor,
          theme: s.theme ?? defaultBranding.theme,
          loginSubtitle: s.loginSubtitle ?? defaultBranding.loginSubtitle,
          footerText: s.footerText ?? defaultBranding.footerText,
          supportUrl: s.supportUrl ?? defaultBranding.supportUrl,
          seoTitle: s.seoTitle ?? defaultBranding.seoTitle,
          seoDescription: s.seoDescription ?? defaultBranding.seoDescription,
          announcementText: s.announcementText ?? defaultBranding.announcementText,
          announcementEnabled: s.announcementEnabled ?? defaultBranding.announcementEnabled,
          registrationEnabled: s.registrationEnabled ?? defaultBranding.registrationEnabled,
        });
      } catch {
        setForm(defaultBranding);
      } finally {
        setLoading(false);
      }
    };
    fetchBranding();
  }, []);

  const update = (fields: Partial<BrandingState>) =>
    setForm((prev) => ({ ...prev, ...fields }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.put('/branding', { settings: form });
      applyTheme({
        siteName: form.siteName,
        logo: form.logo,
        primaryColor: form.primaryColor,
        secondaryColor: form.bgColor,
        accentColor: form.accentColor,
      });
      setMessage('Branding saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Branding</h1>
          <p className="mt-1 text-gray-400">Customize the look and feel of the panel.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>

      {message && (
        <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">{message}</div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* General */}
          <Section icon={Type} title="General">
            <div className="space-y-4">
              <Field label="Site Name">
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(e) => update({ siteName: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="DiscordHost"
                />
              </Field>
              <Field label="Logo URL">
                <input
                  type="text"
                  value={form.logo}
                  onChange={(e) => update({ logo: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="https://example.com/logo.png"
                />
              </Field>
              <Field label="Favicon URL">
                <input
                  type="text"
                  value={form.favicon}
                  onChange={(e) => update({ favicon: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="https://example.com/favicon.ico"
                />
              </Field>
              <Field label="Background Image URL">
                <input
                  type="text"
                  value={form.backgroundImage}
                  onChange={(e) => update({ backgroundImage: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="https://example.com/bg.jpg"
                />
              </Field>
            </div>
          </Section>

          {/* Colors */}
          <Section icon={Palette} title="Colors">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label="Background Color" value={form.bgColor} onChange={(v) => update({ bgColor: v })} />
              <ColorField label="Primary Color" value={form.primaryColor} onChange={(v) => update({ primaryColor: v })} />
              <ColorField label="Accent Color" value={form.accentColor} onChange={(v) => update({ accentColor: v })} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Background Gradient</label>
                <input
                  type="text"
                  value={form.bgGradient}
                  onChange={(e) => update({ bgGradient: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Theme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => update({ theme: 'dark' })}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${
                    form.theme === 'dark'
                      ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </button>
                <button
                  onClick={() => update({ theme: 'light' })}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${
                    form.theme === 'light'
                      ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </button>
              </div>
            </div>
          </Section>

          {/* Text & SEO */}
          <Section icon={Globe} title="Text & SEO">
            <div className="space-y-4">
              <Field label="Login Subtitle">
                <input
                  type="text"
                  value={form.loginSubtitle}
                  onChange={(e) => update({ loginSubtitle: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
              <Field label="Footer Text">
                <input
                  type="text"
                  value={form.footerText}
                  onChange={(e) => update({ footerText: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
              <Field label="Support URL">
                <input
                  type="text"
                  value={form.supportUrl}
                  onChange={(e) => update({ supportUrl: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="https://support.example.com"
                />
              </Field>
              <Field label="SEO Title">
                <input
                  type="text"
                  value={form.seoTitle}
                  onChange={(e) => update({ seoTitle: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
              <Field label="SEO Description">
                <textarea
                  value={form.seoDescription}
                  onChange={(e) => update({ seoDescription: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
            </div>
          </Section>

          {/* Announcement */}
          <Section icon={Megaphone} title="Announcement">
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.announcementEnabled}
                  onChange={(e) => update({ announcementEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700"
                />
                <span className="text-sm font-medium text-white">Enable Announcement Banner</span>
              </label>
              {form.announcementEnabled && (
                <Field label="Banner Text">
                  <input
                    type="text"
                    value={form.announcementText}
                    onChange={(e) => update({ announcementText: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter announcement text..."
                  />
                </Field>
              )}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.registrationEnabled}
                  onChange={(e) => update({ registrationEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700"
                />
                <span className="text-sm font-medium text-white">Allow Registration</span>
              </label>
            </div>
          </Section>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Section icon={Eye} title="Live Preview">
              <div
                className="overflow-hidden rounded-lg border border-white/10"
                style={{
                  background: form.bgGradient || form.bgColor,
                }}
              >
                {form.announcementEnabled && form.announcementText && (
                  <div className="bg-yellow-500/20 px-3 py-2 text-center text-xs text-yellow-300">
                    {form.announcementText}
                  </div>
                )}
                <div className="p-6 text-center">
                  {form.logo ? (
                    <img src={form.logo} alt="Logo" className="mx-auto mb-3 h-10 w-10 object-contain" />
                  ) : (
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold" style={{ backgroundColor: form.primaryColor }}>
                      {form.siteName?.[0] || 'D'}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-white">{form.siteName || 'DiscordHost'}</h3>
                  <p className="mt-1 text-xs text-gray-400">{form.loginSubtitle}</p>
                  <div className="mt-4 space-y-2">
                    <div
                      className="rounded-lg px-4 py-2 text-sm text-white font-medium"
                      style={{ backgroundColor: form.primaryColor }}
                    >
                      Sign In
                    </div>
                    {form.registrationEnabled && (
                      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400">
                        Create Account
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-white/10 px-3 py-2 text-center text-[10px] text-gray-500">
                  {form.footerText}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-500">Color Palette</p>
                <div className="flex gap-2">
                  <div className="h-8 flex-1 rounded" style={{ backgroundColor: form.bgColor }} title="Background" />
                  <div className="h-8 flex-1 rounded" style={{ backgroundColor: form.primaryColor }} title="Primary" />
                  <div className="h-8 flex-1 rounded" style={{ backgroundColor: form.accentColor }} title="Accent" />
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{
  icon: React.FC<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-5 w-5 text-indigo-400" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
    {children}
  </div>
);

const ColorField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-10 shrink-0 rounded border-0 bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  </div>
);

export default AdminBrandingPage;

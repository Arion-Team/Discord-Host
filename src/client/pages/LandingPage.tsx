import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useBrandingStore } from '../lib/store';
import api from '../lib/api';
import {
  Bot,
  Shield,
  Zap,
  Globe,
  Settings,
  Terminal,
  HardDrive,
  BarChart3,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const { user } = useAuthStore();
  const { settings, fetchBranding } = useBrandingStore();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    fetchBranding();
    api.get('/auth/demo-check').then((r: any) => setDemoMode(r.demoMode)).catch(() => {});
  }, [fetchBranding]);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleDemoLogin = () => {
    const demoPort = import.meta.env.VITE_DEMO_PORT || '3001';
    const base = window.location.hostname;
    window.location.href = `http://${base}:${demoPort}`;
  };

  const features = [
    { icon: Bot, title: 'Bot Hosting', desc: 'Host unlimited Discord bots with auto-restart, logs, and file management.' },
    { icon: Shield, title: 'Discord Verification', desc: 'Secure account linking via Discord bot slash commands.' },
    { icon: Terminal, title: 'Web Console', desc: 'Real-time terminal output and in-browser code editor.' },
    { icon: HardDrive, title: 'File Manager', desc: 'Browse, upload, download, and edit bot files directly in the panel.' },
    { icon: BarChart3, title: 'Admin Dashboard', desc: 'Monitor users, bots, system resources, and manage everything from one place.' },
    { icon: Zap, title: 'Auto Install', desc: 'Bots auto-install dependencies (npm/pip) on first start.' },
    { icon: Globe, title: 'Full Branding', desc: 'Customize logo, colors, background, favicon — make it yours.' },
    { icon: Settings, title: 'Hosting Plans', desc: 'Create tiered plans with RAM, storage, and bot limits.' },
  ];

  const plans = [
    { name: 'Free', price: '$0', features: ['2 Bots', '256 MB RAM', '1 GB Storage', 'Community Support'], popular: false },
    { name: 'Basic', price: '$5/mo', features: ['5 Bots', '512 MB RAM', '5 GB Storage', 'Priority Support'], popular: true },
    { name: 'Pro', price: '$15/mo', features: ['15 Bots', '1 GB RAM', '20 GB Storage', '24/7 Support', 'Custom Domain'], popular: false },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
                {settings.siteName?.[0] || 'D'}
              </div>
            )}
            <span className="text-lg font-bold">{settings.siteName || 'DiscordHost'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Login
            </Link>
            {demoMode && (
              <button onClick={handleDemoLogin}
                className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-black hover:bg-gray-100 transition-all active:scale-[0.98]">
                Try Demo
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-400">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            Open Source Discord Bot Panel
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Host Your Discord Bots
            <br />
            <span className="text-gray-500">With Zero Hassle</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400">
            A complete, self-hosted panel for managing Discord bots. Deploy, monitor, and control everything from a beautiful dashboard.
          </p>
          <div className="flex items-center justify-center gap-4">
            {demoMode && (
              <button onClick={handleDemoLogin}
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-black hover:bg-gray-100 transition-all active:scale-[0.98]">
                Try Live Demo
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <a href="https://github.com/Arion-Team/Discord-Host" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-gray-300 hover:bg-white/10 transition-all">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Everything You Need</h2>
            <p className="text-gray-400">A complete solution for hosting and managing Discord bots</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Hosting Plans</h2>
            <p className="text-gray-400">Flexible plans for every scale</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={`relative rounded-2xl border p-8 transition-colors ${
                p.popular ? 'border-white/20 bg-white/[0.04]' : 'border-white/5 bg-white/[0.02]'
              }`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-semibold text-black">
                    Most Popular
                  </div>
                )}
                <h3 className="mb-2 text-xl font-bold">{p.name}</h3>
                <div className="mb-6 text-3xl font-bold">{p.price}</div>
                <ul className="space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mb-8 text-gray-400">Deploy your first bot in under a minute</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/login" className="flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-black hover:bg-gray-100 transition-all">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-sm text-gray-500">
          <span>{settings.footerText || settings.siteName || 'DiscordHost'}</span>
          <span>Powered by DiscordHost</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

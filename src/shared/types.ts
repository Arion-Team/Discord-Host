export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  planId: string | null;
  storageUsedMb: number;
  suspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bot {
  id: string;
  userId: string;
  name: string;
  runtime: 'node' | 'python';
  status: 'stopped' | 'running' | 'crashed' | 'starting' | 'stopping';
  token: string;
  startupCommand: string;
  workingDirectory: string;
  ramMb: number;
  cpuPercent: number;
  uptimeMs: number;
  autoRestart: boolean;
  envVars: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotLog {
  id: string;
  botId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

export interface HostingPlan {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  ramMb: number;
  cpuPercent: number;
  storageMb: number;
  maxBots: number;
  features: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface BrandingSettings {
  siteName: string;
  siteLogo: string;
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
  announcementBanner: string;
  announcementEnabled: boolean;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  permissions: string;
  createdAt: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
}

export interface BotStats {
  cpu: number;
  ram: number;
  uptime: number;
  status: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalBots: number;
  runningBots: number;
  crashedBots: number;
  systemCpu: number;
  systemRam: number;
  storageUsed: number;
  storageTotal: number;
}

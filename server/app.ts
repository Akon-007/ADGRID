import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_PREFIX = '/api';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const HASHED_REFRESH_TOKENS = new Map<string, { userId: string; expiresAt: number; revokedAt?: number }>();
const VALID_TOKENS = new Map<string, { user: BackendUser; expiresAt: number }>();
const MFA_SECRETS = new Map<string, string>();
const MFA_BACKUP_CODES = new Map<string, string[]>();
const EMAIL_TOKENS = new Map<string, { userId: string; type: 'VERIFY_EMAIL' | 'RESET_PASSWORD'; expiresAt: number; consumedAt?: number }>();
const RESET_TOKENS = new Map<string, { userId: string; expiresAt: number; consumedAt?: number }>();

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  title: string;
  avatarUrl: string;
  permissions: string[];
  authorizedDashboard: string;
  tenantId?: string;
  emailVerifiedAt?: string | null;
  status?: string;
}

const USERS_DB: BackendUser[] = [
  {
    id: 'usr-agency-admin',
    name: 'Kofi Mensah',
    email: 'kofi.admin@afrireach.africa',
    role: 'Agency Admin',
    organization: 'AfriReach Pan-African Media Group',
    title: 'Managing Director & Partner',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    permissions: ['agency:all', 'campaigns:manage', 'operations:manage', 'finance:view', 'verification:approve'],
    authorizedDashboard: '/admin/agency',
    tenantId: 'tenant-agency-afrireach',
  },
  {
    id: 'usr-account-mgr',
    name: 'Amina Bello',
    email: 'amina.bello@afrireach.africa',
    role: 'Account Manager',
    organization: 'AfriReach West Africa Agency',
    title: 'Senior Client Partner (Telco & FMCG)',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    permissions: ['clients:manage', 'campaigns:manage', 'reports:view'],
    authorizedDashboard: '/admin/agency',
    tenantId: 'tenant-agency-afrireach',
  },
  {
    id: 'usr-campaign-mgr',
    name: 'Chidi Okafor',
    email: 'chidi.campaigns@afrireach.africa',
    role: 'Campaign Manager',
    organization: 'AfriReach Flight Command',
    title: 'Pan-African Traffic & Pacing Director',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    permissions: ['campaigns:manage', 'bookings:manage', 'locations:view'],
    authorizedDashboard: '/admin/agency',
    tenantId: 'tenant-agency-afrireach',
  },
  {
    id: 'usr-ops-mgr',
    name: 'Tendai Moyo',
    email: 'tendai.ops@afrireach.africa',
    role: 'Operations Manager',
    organization: 'AfriReach Regional Logistics Hub',
    title: 'Regional Field & Rigging Operations Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    permissions: ['operations:manage', 'field-teams:manage', 'jobs:manage'],
    authorizedDashboard: '/admin/agency',
    tenantId: 'tenant-agency-afrireach',
  },
  {
    id: 'usr-finance-mgr',
    name: 'Nkosana Dlamini',
    email: 'nkosana.treasury@afrireach.africa',
    role: 'Finance Manager',
    organization: 'AfriReach Treasury & Settlement',
    title: 'Head of Escrow & Cross-Border Clearing',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    permissions: ['finance:all', 'invoices:manage', 'settlements:manage'],
    authorizedDashboard: '/admin/agency',
    tenantId: 'tenant-agency-afrireach',
  },
  {
    id: 'usr-field-mgr',
    name: 'Wanjiku Kamau',
    email: 'wanjiku.field@afrireach.africa',
    role: 'Field Manager',
    organization: 'AfriReach East Africa Audit Squad',
    title: 'Chief Verification Auditor (Nairobi Node)',
    avatarUrl: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=300&q=80',
    permissions: ['field-audit:manage', 'jobs:verify', 'evidence:manage'],
    authorizedDashboard: '/admin/agency',
    tenantId: 'tenant-agency-afrireach',
  },
  {
    id: 'usr-agency-staff',
    name: 'David Osei',
    email: 'david.media@afrireach.africa',
    role: 'Agency Staff',
    organization: 'AfriReach Creative & Traffic Staff',
    title: 'Digital Asset & Schedule Coordinator',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    permissions: ['campaigns:view', 'jobs:view'],
    authorizedDashboard: '/admin/agency',
    tenantId: 'tenant-agency-afrireach',
  },
  {
    id: 'usr-client-company',
    name: 'Farai Mutasa',
    email: 'fmutasa@safaricom.co.ke',
    role: 'Customer / Client Company',
    organization: 'Safaricom PLC (Brand Operations)',
    title: 'Head of Brand Experience & OOH Investments',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    permissions: ['client:tracker', 'client:campaigns', 'client:purchase', 'client:invoices', 'client:evidence'],
    authorizedDashboard: '/admin/client',
    tenantId: 'tenant-client-safaricom',
  },
  {
    id: 'usr-media-owner',
    name: 'Folashade Adeleke',
    email: 'fadeleke@continentaloutdoor.ng',
    role: 'Media Owner',
    organization: 'Continental Outdoor & Alliance Media Concession',
    title: 'Managing Director & Concessionaire',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
    permissions: ['inventory:manage', 'bookings:view', 'revenue:view', 'yield:optimize'],
    authorizedDashboard: '/admin/media-owner',
    tenantId: 'tenant-media-owner-continental',
  },
  {
    id: 'usr-vendor',
    name: 'Oluwaseun Bakare',
    email: 'sbakare@arclightmedia.ng',
    role: 'Vendor',
    organization: 'Arclight Fabrication & Grand-Format Printing Ltd',
    title: 'Tier-1 Technical Contractor & Print Principal',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    permissions: ['jobs:assigned', 'jobs:update', 'earnings:view'],
    authorizedDashboard: '/admin/vendor',
    tenantId: 'tenant-vendor-arclight',
  },
  {
    id: 'usr-field-agent',
    name: 'Babatunde Oladipo',
    email: 'babatunde.field@afrireach.africa',
    role: 'Field Agent',
    organization: 'Lagos Rapid Audit Unit (Mobile OS)',
    title: 'Senior Field Operative & Drone Auditor',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    permissions: ['mobile-os:access', 'jobs:execute', 'evidence:upload', 'gps:verify'],
    authorizedDashboard: '/admin/field-agent',
    tenantId: 'tenant-field-lagos',
  },
  {
    id: 'usr-platform-admin',
    name: 'Dr. Tariro Sithole',
    email: 'tariro.admin@adgrid.cloud',
    role: 'Platform Admin',
    organization: 'ADGRID Governance & Trust Protocol',
    title: 'Platform Chief Infrastructure Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80',
    permissions: ['platform:superadmin', 'governance:all', 'audit:all', 'tenants:all', 'security:all'],
    authorizedDashboard: '/admin/platform',
    tenantId: 'tenant-platform-afriooh',
  },
];

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.', code: 'rate_limited' },
  skipSuccessfulRequests: false,
});

const authSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(2).optional(),
  organization: z.string().min(2).optional(),
  role: z.string().optional(),
  title: z.string().optional(),
  licenseNumber: z.string().optional(),
  city: z.string().optional(),
  targetPath: z.string().optional(),
  mfaToken: z.string().optional(),
  code: z.string().optional(),
  token: z.string().optional(),
});

function getHash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function signAccessToken(user: BackendUser) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      permissions: user.permissions,
    },
    JWT_ACCESS_SECRET as any,
    { expiresIn: ACCESS_TOKEN_TTL } as any
  );
}

function signMfaToken(user: BackendUser) {
  return jwt.sign(
    { sub: user.id, type: 'mfa', email: user.email },
    JWT_ACCESS_SECRET as any,
    { expiresIn: '5m' } as any
  );
}

function signRefreshToken(user: BackendUser) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = getHash(token);
  HASHED_REFRESH_TOKENS.set(hash, {
    userId: user.id,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  return token;
}

function getUserFromToken(token: string | null | undefined): BackendUser | null {
  if (!token) return null;

  const session = VALID_TOKENS.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session.user;
  }
  if (session) VALID_TOKENS.delete(token);

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as { sub?: string; email?: string; role?: string };
    if (!decoded.sub) return null;
    const user = USERS_DB.find((entry) => entry.id === decoded.sub || entry.email === decoded.email);
    if (!user) return null;
    return user;
  } catch {
    return null;
  }
}

function getUserFromBearer(req: Request): BackendUser | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return getUserFromToken(header.slice(7).trim());
  }
  return null;
}

function getAuthorizedDashboardForRole(role: string): string {
  const map: Record<string, string> = {
    'Agency Admin': '/admin/agency',
    'Account Manager': '/admin/agency',
    'Campaign Manager': '/admin/agency',
    'Operations Manager': '/admin/agency',
    'Finance Manager': '/admin/agency',
    'Field Manager': '/admin/agency',
    'Agency Staff': '/admin/agency',
    'Customer / Client Company': '/admin/client',
    'Media Owner': '/admin/media-owner',
    'Vendor': '/admin/vendor',
    'Field Agent': '/admin/field-agent',
    'Platform Admin': '/admin/platform',
  };

  return map[role] || '/admin/media-owner';
}

function hasRoleAccess(user: BackendUser, targetPath: string): boolean {
  const path = targetPath || '/';
  if (user.role === 'Platform Admin') return true;
  if (path.startsWith('/admin/agency')) {
    return ['Agency Admin', 'Account Manager', 'Campaign Manager', 'Operations Manager', 'Finance Manager', 'Field Manager', 'Agency Staff'].includes(user.role);
  }
  if (path.startsWith('/admin/client')) return user.role === 'Customer / Client Company';
  if (path.startsWith('/admin/media-owner')) return user.role === 'Media Owner';
  if (path.startsWith('/admin/vendor')) return user.role === 'Vendor';
  if (path.startsWith('/admin/field-agent')) return user.role === 'Field Agent';
  if (path.startsWith('/admin/platform')) return user.role === 'Platform Admin';
  return true;
}

async function sendVerificationEmail(user: BackendUser, token: string) {
  const link = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your AfriOOH Cloud email',
    html: `<p>Welcome to AfriOOH Cloud.</p><p><a href="${link}">Verify your email address</a></p>`,
  });
}

async function sendPasswordResetEmail(user: BackendUser, token: string) {
  const link = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your AfriOOH Cloud password',
    html: `<p>A password reset was requested for your AfriOOH Cloud account.</p><p><a href="${link}">Reset your password</a></p>`,
  });
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY is not configured; skipped email to ${to}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, html }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${details}`);
  }
}

function createUserRecord(payload: any): BackendUser {
  const role = payload.role || 'Media Owner';
  const dashboard = getAuthorizedDashboardForRole(role);
  const user: BackendUser = {
    id: `usr-${Math.random().toString(36).slice(2, 10)}`,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    role,
    organization: payload.organization.trim(),
    title: payload.title || (role === 'Media Owner' ? 'Managing Director & Concessionaire' : 'Administrator'),
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    permissions: payload.permissions || [],
    authorizedDashboard: dashboard,
    tenantId: `tenant-${role.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`,
  };
  return user;
}

function generateBackupCodes() {
  return Array.from({ length: 10 }, () => Math.random().toString(36).slice(2, 8).toUpperCase());
}

function validatePasswordStrength(password: string) {
  return password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}
app.use(cors({ origin: process.env.APP_URL || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

app.use(`${API_PREFIX}/auth`, loginRateLimit);

app.post(`${API_PREFIX}/auth/signup`, async (req: Request, res: Response) => {
  const parsed = authSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid signup payload.' });
  }

  const { name, email, organization, role, title, password } = parsed.data;
  if (!name || !email || !organization) {
    return res.status(400).json({ success: false, error: 'Name, email, and organization/company are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = USERS_DB.find((user) => user.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ success: false, error: 'An account with this email address already exists. Please sign in.' });
  }

  const chosenRole = role || 'Media Owner';
  const rolePermissions: Record<string, string[]> = {
    'Agency Admin': ['agency:all', 'campaigns:manage', 'operations:manage', 'finance:view', 'verification:approve'],
    'Account Manager': ['clients:manage', 'campaigns:manage', 'reports:view'],
    'Campaign Manager': ['campaigns:manage', 'bookings:manage', 'locations:view'],
    'Operations Manager': ['operations:manage', 'field-teams:manage', 'jobs:manage'],
    'Finance Manager': ['finance:all', 'invoices:manage', 'settlements:manage'],
    'Field Manager': ['field-audit:manage', 'jobs:verify', 'evidence:manage'],
    'Agency Staff': ['campaigns:view', 'jobs:view'],
    'Customer / Client Company': ['client:tracker', 'client:campaigns', 'client:purchase', 'client:invoices', 'client:evidence'],
    'Media Owner': ['inventory:manage', 'billboards:create', 'billboards:export', 'bookings:view', 'yield:optimize'],
    'Vendor': ['jobs:assigned', 'jobs:update', 'earnings:view'],
    'Field Agent': ['mobile-os:access', 'jobs:execute', 'evidence:upload', 'gps:verify'],
    'Platform Admin': ['platform:superadmin', 'governance:all', 'audit:all', 'tenants:all', 'security:all'],
  };

  const passwordHash = await bcrypt.hash(password || 'AfriOOH!2026', 12);
  const user = createUserRecord({
    name,
    email,
    organization,
    role: chosenRole,
    title,
    permissions: rolePermissions[chosenRole] || ['campaigns:view'],
  });
  const finalUser = { ...user, passwordHash } as BackendUser & { passwordHash?: string };
  USERS_DB.push(finalUser as BackendUser);

  const emailToken = crypto.randomBytes(24).toString('hex');
  EMAIL_TOKENS.set(emailToken, {
    userId: finalUser.id,
    type: 'VERIFY_EMAIL',
    expiresAt: Date.now() + 1000 * 60 * 60 * 24,
  });
  await sendVerificationEmail(finalUser, emailToken);

  const accessToken = signAccessToken(finalUser);
  const refreshToken = signRefreshToken(finalUser);
  const refreshHash = getHash(refreshToken);
  HASHED_REFRESH_TOKENS.set(refreshHash, { userId: finalUser.id, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return res.status(201).json({
    success: true,
    token: accessToken,
    user: finalUser,
    redirectTo: finalUser.authorizedDashboard,
  });
});

app.post(`${API_PREFIX}/auth/login`, async (req: Request, res: Response) => {
  const parsed = authSchema.safeParse(req.body || {});
  if (!parsed.success || !parsed.data.email || !parsed.data.password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const user = USERS_DB.find((candidate) => candidate.email.toLowerCase() === email);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials. No authorized platform tenant found for this email.' });
  }

  const storedHash = (user as any).passwordHash || await bcrypt.hash('AfriOOH!2026', 12);
  const passwordMatches = await bcrypt.compare(password, storedHash);
  if (!passwordMatches) {
    return res.status(401).json({ success: false, error: 'Invalid credentials. Please check your email and password.' });
  }

  if (MFA_SECRETS.has(user.id)) {
    const mfaToken = signMfaToken(user);
    return res.status(200).json({ mfaRequired: true, mfaToken });
  }

  const token = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return res.json({ success: true, token, user, redirectTo: user.authorizedDashboard });
});

app.post(`${API_PREFIX}/auth/mfa/enable`, (req: Request, res: Response) => {
  const user = getUserFromBearer(req) || getUserFromToken((req.headers.authorization || '').replace('Bearer ', ''));
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  const secret = authenticator.generateSecret();
  MFA_SECRETS.set(user.id, secret);
  const otpauth = authenticator.keyuri(user.email, 'ADGRID', secret);
  QRCode.toDataURL(otpauth, (error, qrCodeDataUrl) => {
    if (error) {
      return res.status(500).json({ error: 'Unable to generate QR code.' });
    }
    return res.json({ secret, otpauthUrl: otpauth, qrCodeDataUrl });
  });
});

app.post(`${API_PREFIX}/auth/mfa/confirm`, (req: Request, res: Response) => {
  const user = getUserFromBearer(req);
  if (!user) return res.status(401).json({ authenticated: false });
  const code = String(req.body?.code || '');
  const secret = MFA_SECRETS.get(user.id);
  if (!secret || !authenticator.check(code, secret)) {
    return res.status(400).json({ success: false, error: 'Invalid MFA code.' });
  }
  const backupCodes = generateBackupCodes();
  MFA_BACKUP_CODES.set(user.id, backupCodes);
  const currentUser = USERS_DB.find((entry) => entry.id === user.id);
  if (currentUser) {
    currentUser.status = 'active';
  }
  return res.json({ success: true, backupCodes });
});

app.post(`${API_PREFIX}/auth/mfa/verify`, async (req: Request, res: Response) => {
  const parsed = authSchema.safeParse(req.body || {});
  if (!parsed.success || !parsed.data.mfaToken || !parsed.data.code) {
    return res.status(400).json({ success: false, error: 'mfaToken and code are required.' });
  }

  try {
    const decoded = jwt.verify(parsed.data.mfaToken, JWT_ACCESS_SECRET) as { sub?: string; email?: string; type?: string };
    const user = USERS_DB.find((entry) => entry.id === decoded.sub || entry.email === decoded.email);
    if (!user) return res.status(401).json({ success: false, error: 'Invalid MFA token.' });

    const secret = MFA_SECRETS.get(user.id);
    const backupCodes = MFA_BACKUP_CODES.get(user.id) || [];
    const validTotp = secret ? authenticator.check(parsed.data.code, secret) : false;
    const validBackup = backupCodes.includes(parsed.data.code.toUpperCase());

    if (!validTotp && !validBackup) {
      return res.status(401).json({ success: false, error: 'Invalid MFA code.' });
    }

    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.json({ success: true, token, user, redirectTo: user.authorizedDashboard });
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid MFA token.' });
  }
});

app.post(`${API_PREFIX}/auth/mfa/disable`, (req: Request, res: Response) => {
  const user = getUserFromBearer(req);
  if (!user) return res.status(401).json({ authenticated: false });
  const { code, password } = req.body || {};
  const validCode = code && MFA_SECRETS.has(user.id) && authenticator.check(String(code), MFA_SECRETS.get(user.id) || '');
  const validPassword = password && bcrypt.compareSync(password, (user as any).passwordHash || bcrypt.hashSync('AfriOOH!2026', 12));
  if (!validCode && !validPassword) {
    return res.status(400).json({ success: false, error: 'MFA code and password are required.' });
  }
  MFA_SECRETS.delete(user.id);
  MFA_BACKUP_CODES.delete(user.id);
  return res.json({ success: true });
});

app.get(`${API_PREFIX}/auth/me`, (req: Request, res: Response) => {
  const user = getUserFromBearer(req);
  if (!user) {
    return res.status(401).json({ authenticated: false, error: 'Unauthenticated' });
  }
  return res.json({ authenticated: true, user });
});

app.post(`${API_PREFIX}/auth/refresh`, (req: Request, res: Response) => {
  const refreshToken = (req.cookies && req.cookies.refresh_token) || null;
  if (!refreshToken) return res.status(401).json({ success: false, error: 'Refresh token missing.' });

  const hash = getHash(refreshToken);
  const record = HASHED_REFRESH_TOKENS.get(hash);
  if (!record || record.expiresAt < Date.now()) {
    return res.status(401).json({ success: false, error: 'Refresh token expired.' });
  }

  const user = USERS_DB.find((entry) => entry.id === record.userId);
  if (!user) return res.status(401).json({ success: false, error: 'Unknown user.' });

  HASHED_REFRESH_TOKENS.delete(hash);
  const newRefreshToken = signRefreshToken(user);
  res.cookie('refresh_token', newRefreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return res.json({ success: true, token: signAccessToken(user), user, redirectTo: user.authorizedDashboard });
});

app.post(`${API_PREFIX}/auth/logout`, (req: Request, res: Response) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : null;
  if (token) {
    VALID_TOKENS.delete(token);
  }
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    HASHED_REFRESH_TOKENS.delete(getHash(refreshToken));
  }
  res.clearCookie('refresh_token');
  return res.json({ success: true });
});

app.post(`${API_PREFIX}/auth/validate-access`, (req: Request, res: Response) => {
  const parsed = authSchema.safeParse(req.body || {});
  const targetPath = parsed.success ? parsed.data.targetPath || '' : '';
  const user = getUserFromBearer(req);

  if (!user) {
    if (targetPath === '/admin' || targetPath === '/admin/') {
      return res.json({ authorized: true, status: 200, showLogin: true });
    }
    if (targetPath.startsWith('/admin/')) {
      return res.status(401).json({ authorized: false, status: 401, redirectTo: '/admin', error: 'Authentication required. Redirecting to central login.' });
    }
    return res.json({ authorized: true, status: 200, isPublic: true });
  }

  if (targetPath === '/admin' || targetPath === '/admin/') {
    return res.json({ authorized: true, status: 200, alreadyAuthenticated: true, redirectTo: user.authorizedDashboard, user });
  }

  if (!hasRoleAccess(user, targetPath)) {
    return res.status(403).json({
      authorized: false,
      status: 403,
      redirectTo: user.authorizedDashboard,
      error: `Access Denied: Your account role (${user.role}) is not authorized for ${targetPath}. Redirected to your workspace.`,
      user,
    });
  }

  return res.json({
    authorized: true,
    status: 200,
    user,
    dashboardRoute: user.authorizedDashboard,
  });
});

app.get(`${API_PREFIX}/auth/verify-email`, (req: Request, res: Response) => {
  const token = String(req.query.token || '');
  const record = EMAIL_TOKENS.get(token);
  if (!record) return res.status(400).json({ success: false, error: 'Invalid or expired verification token.' });
  if (record.expiresAt < Date.now()) return res.status(400).json({ success: false, error: 'Verification token expired.' });

  const user = USERS_DB.find((entry) => entry.id === record.userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

  user.emailVerifiedAt = new Date().toISOString();
  record.consumedAt = Date.now();
  EMAIL_TOKENS.delete(token);
  return res.json({ success: true, message: 'Email verified successfully.' });
});

app.post(`${API_PREFIX}/auth/forgot-password`, async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });

  const user = USERS_DB.find((entry) => entry.email.toLowerCase() === email);
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    RESET_TOKENS.set(token, { userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 });
    await sendPasswordResetEmail(user, token);
  }

  return res.json({ success: true, message: 'If an account exists, a password reset link has been sent.' });
});

app.post(`${API_PREFIX}/auth/reset-password`, async (req: Request, res: Response) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ success: false, error: 'Token and password are required.' });
  if (!validatePasswordStrength(password)) {
    return res.status(400).json({ success: false, error: 'Password must contain at least 10 chars, 1 uppercase, 1 lowercase, and 1 digit.' });
  }

  const record = RESET_TOKENS.get(String(token));
  if (!record || record.expiresAt < Date.now()) {
    return res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
  }

  const user = USERS_DB.find((entry) => entry.id === record.userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

  (user as any).passwordHash = await bcrypt.hash(password, 12);
  RESET_TOKENS.delete(String(token));
  HASHED_REFRESH_TOKENS.clear();
  return res.json({ success: true, message: 'Password reset successfully.' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error', code: 'internal_error' });
});

export async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ADGRID Platform Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;

import * as PrismaPkg from '@prisma/client';
import bcrypt from 'bcryptjs';

let prisma: any;
try {
  const PrismaClient = (PrismaPkg as any).PrismaClient;
  prisma = new PrismaClient();
} catch {
  console.warn('[AI Studio] Database not connected — using mock');
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
    deleteMany: async () => ({ count: 0 }),
  };
  prisma = new Proxy({}, { get: () => noOp });
}

const USERS_DB = [
  { name: 'Kofi Mensah', email: 'kofi.admin@afrireach.africa', role: 'Agency Admin', organization: 'AfriReach Pan-African Media Group', title: 'Managing Director & Partner' },
  { name: 'Amina Bello', email: 'amina.bello@afrireach.africa', role: 'Account Manager', organization: 'AfriReach West Africa Agency', title: 'Senior Client Partner (Telco & FMCG)' },
  { name: 'Chidi Okafor', email: 'chidi.campaigns@afrireach.africa', role: 'Campaign Manager', organization: 'AfriReach Flight Command', title: 'Pan-African Traffic & Pacing Director' },
  { name: 'Tendai Moyo', email: 'tendai.ops@afrireach.africa', role: 'Operations Manager', organization: 'AfriReach Regional Logistics Hub', title: 'Regional Field & Rigging Operations Lead' },
  { name: 'Nkosana Dlamini', email: 'nkosana.treasury@afrireach.africa', role: 'Finance Manager', organization: 'AfriReach Treasury & Settlement', title: 'Head of Escrow & Cross-Border Clearing' },
  { name: 'Wanjiku Kamau', email: 'wanjiku.field@afrireach.africa', role: 'Field Manager', organization: 'AfriReach East Africa Audit Squad', title: 'Chief Verification Auditor (Nairobi Node)' },
  { name: 'David Osei', email: 'david.media@afrireach.africa', role: 'Agency Staff', organization: 'AfriReach Creative & Traffic Staff', title: 'Digital Asset & Schedule Coordinator' },
  { name: 'Farai Mutasa', email: 'fmutasa@safaricom.co.ke', role: 'Customer / Client Company', organization: 'Safaricom PLC (Brand Operations)', title: 'Head of Brand Experience & OOH Investments' },
  { name: 'Folashade Adeleke', email: 'fadeleke@continentaloutdoor.ng', role: 'Media Owner', organization: 'Continental Outdoor & Alliance Media Concession', title: 'Managing Director & Concessionaire' },
  { name: 'Oluwaseun Bakare', email: 'sbakare@arclightmedia.ng', role: 'Vendor', organization: 'Arclight Fabrication & Grand-Format Printing Ltd', title: 'Tier-1 Technical Contractor & Print Principal' },
  { name: 'Babatunde Oladipo', email: 'babatunde.field@afrireach.africa', role: 'Field Agent', organization: 'Lagos Rapid Audit Unit (Mobile OS)', title: 'Senior Field Operative & Drone Auditor' },
  { name: 'Dr. Tariro Sithole', email: 'tariro.admin@adgrid.cloud', role: 'Platform Admin', organization: 'ADGRID Governance & Trust Protocol', title: 'Platform Chief Infrastructure Architect' },
] as const;

const rolePermissionList = [
  'agency:all', 'campaigns:manage', 'operations:manage', 'finance:view', 'verification:approve', 'clients:manage', 'campaigns:manage', 'reports:view', 'bookings:manage', 'locations:view', 'field-teams:manage', 'jobs:manage', 'finance:all', 'invoices:manage', 'settlements:manage', 'field-audit:manage', 'jobs:verify', 'evidence:manage', 'campaigns:view', 'jobs:view', 'client:tracker', 'client:campaigns', 'client:purchase', 'client:invoices', 'client:evidence', 'inventory:manage', 'billboards:create', 'billboards:export', 'bookings:view', 'revenue:view', 'yield:optimize', 'jobs:assigned', 'jobs:update', 'earnings:view', 'mobile-os:access', 'jobs:execute', 'evidence:upload', 'gps:verify', 'platform:superadmin', 'governance:all', 'audit:all', 'tenants:all', 'security:all'
];

const metros = [
  { code: 'LOS', name: 'Lagos', country: 'Nigeria', currency: 'NGN', currencySymbol: '₦', sitesCount: 42, crewsCount: 12, complianceRate: 98.6 },
  { code: 'ABJ', name: 'Abuja', country: 'Nigeria', currency: 'NGN', currencySymbol: '₦', sitesCount: 23, crewsCount: 8, complianceRate: 96.8 },
  { code: 'PHC', name: 'Port Harcourt', country: 'Nigeria', currency: 'NGN', currencySymbol: '₦', sitesCount: 18, crewsCount: 6, complianceRate: 95.1 },
  { code: 'IBD', name: 'Ibadan', country: 'Nigeria', currency: 'NGN', currencySymbol: '₦', sitesCount: 14, crewsCount: 5, complianceRate: 94.4 },
  { code: 'KAN', name: 'Kano', country: 'Nigeria', currency: 'NGN', currencySymbol: '₦', sitesCount: 20, crewsCount: 7, complianceRate: 97.2 },
  { code: 'NBO', name: 'Nairobi', country: 'Kenya', currency: 'KES', currencySymbol: 'KSh', sitesCount: 31, crewsCount: 10, complianceRate: 97.9 },
  { code: 'JNB', name: 'Johannesburg', country: 'South Africa', currency: 'ZAR', currencySymbol: 'R', sitesCount: 26, crewsCount: 9, complianceRate: 96.1 },
  { code: 'ACC', name: 'Accra', country: 'Ghana', currency: 'GHS', currencySymbol: '₵', sitesCount: 17, crewsCount: 6, complianceRate: 95.6 },
  { code: 'KGL', name: 'Kigali', country: 'Rwanda', currency: 'RWF', currencySymbol: 'FRw', sitesCount: 12, crewsCount: 4, complianceRate: 94.8 },
  { code: 'ADD', name: 'Addis Ababa', country: 'Ethiopia', currency: 'ETB', currencySymbol: 'Br', sitesCount: 19, crewsCount: 5, complianceRate: 96.3 },
];

function getRoleEnum(value: string): any {
  const map: Record<string, any> = {
    'Agency Admin': 'AGENCY_ADMIN',
    'Account Manager': 'ACCOUNT_MANAGER',
    'Campaign Manager': 'CAMPAIGN_MANAGER',
    'Operations Manager': 'OPERATIONS_MANAGER',
    'Finance Manager': 'FINANCE_MANAGER',
    'Field Manager': 'FIELD_MANAGER',
    'Agency Staff': 'AGENCY_STAFF',
    'Customer / Client Company': 'CLIENT',
    'Media Owner': 'MEDIA_OWNER',
    'Vendor': 'VENDOR',
    'Field Agent': 'FIELD_AGENT',
    'Platform Admin': 'PLATFORM_ADMIN',
  };

  return map[value] ?? 'MEDIA_OWNER';
}

function getTenantType(role: string): any {
  if (role === 'Agency Admin' || role === 'Account Manager' || role === 'Campaign Manager' || role === 'Operations Manager' || role === 'Finance Manager' || role === 'Field Manager' || role === 'Agency Staff') return 'AGENCY';
  if (role === 'Customer / Client Company') return 'CLIENT';
  if (role === 'Media Owner') return 'MEDIA_OWNER';
  if (role === 'Vendor') return 'VENDOR';
  if (role === 'Field Agent') return 'FIELD_UNIT';
  return 'AGENCY';
}

async function main() {
  await prisma.rolePermission.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.emailToken.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.metro.deleteMany({});

  for (const metro of metros) {
    await prisma.metro.create({ data: metro });
  }

  for (const permission of rolePermissionList) {
    await prisma.rolePermission.create({ data: { role: 'GLOBAL', permission } });
  }

  const passwordHash = await bcrypt.hash('AfriOOH!2026', 12);

  for (const user of USERS_DB) {
    const tenant = await prisma.tenant.create({
      data: {
        name: user.organization,
        type: getTenantType(user.role),
        city: user.email.includes('safaricom') ? 'Nairobi' : undefined,
        country: 'Africa',
      },
    });

    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: getRoleEnum(user.role),
        title: user.title,
        tenantId: tenant.id,
        status: 'active',
      },
    });
  }

  console.log('Seeded 12 users and 10 metros.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

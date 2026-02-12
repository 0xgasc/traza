import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('Seeding database...\n');

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@traza.dev' },
    update: {
      platformRole: 'SUPER_ADMIN',
    },
    create: {
      email: 'superadmin@traza.dev',
      passwordHash: await hashPassword('SuperAdmin2024!'),
      name: 'Super Admin',
      platformRole: 'SUPER_ADMIN',
      planTier: 'ENTERPRISE',
    },
  });

  // Create regular admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@traza.dev' },
    update: {},
    create: {
      email: 'admin@traza.dev',
      passwordHash: await hashPassword('Traza2024!'),
      name: 'Admin User',
      planTier: 'PRO',
    },
  });

  // Create test signer
  const signer = await prisma.user.upsert({
    where: { email: 'signer@traza.dev' },
    update: {},
    create: {
      email: 'signer@traza.dev',
      passwordHash: await hashPassword('Traza2024!'),
      name: 'Test Signer',
      planTier: 'FREE',
    },
  });

  // Create organization for admin
  const adminOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      status: 'ACTIVE',
      planTier: 'PRO',
      billingEmail: admin.email,
      primaryColor: '#2563eb',
    },
  });

  // Create membership for admin (as OWNER)
  await prisma.orgMembership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: adminOrg.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizationId: adminOrg.id,
      role: 'OWNER',
    },
  });

  // Create second organization for demo
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      status: 'ACTIVE',
      planTier: 'STARTER',
      billingEmail: 'demo@traza.dev',
      primaryColor: '#10b981',
    },
  });

  // Add signer to demo org as MEMBER
  await prisma.orgMembership.upsert({
    where: {
      userId_organizationId: {
        userId: signer.id,
        organizationId: demoOrg.id,
      },
    },
    update: {},
    create: {
      userId: signer.id,
      organizationId: demoOrg.id,
      role: 'MEMBER',
    },
  });

  // Also add admin to demo org as ADMIN (to test multi-org)
  await prisma.orgMembership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: demoOrg.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizationId: demoOrg.id,
      role: 'ADMIN',
    },
  });

  // Create sample document in admin's org
  const sampleHash = createHash('sha256').update('sample-nda-content').digest('hex');

  const document = await prisma.document.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      organizationId: adminOrg.id,
      createdById: admin.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      ownerId: admin.id,
      organizationId: adminOrg.id,
      createdById: admin.id,
      title: 'Sample NDA Agreement',
      fileUrl: 'documents/sample/nda.pdf',
      fileHash: sampleHash,
      status: 'DRAFT',
    },
  });

  // Create audit log
  await prisma.auditLog.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      documentId: document.id,
      organizationId: adminOrg.id,
      eventType: 'document.created',
      actorId: admin.id,
      resourceType: 'Document',
      resourceId: document.id,
      metadata: {
        title: document.title,
        fileHash: document.fileHash,
      },
    },
  });

  // Create some feature flags
  await prisma.featureFlag.upsert({
    where: { key: 'blockchain_anchoring' },
    update: {},
    create: {
      key: 'blockchain_anchoring',
      name: 'Blockchain Anchoring',
      description: 'Enable document anchoring to Polygon blockchain',
      enabled: true,
      enabledForAll: false,
      enabledPlanTiers: ['PRO', 'PROOF', 'ENTERPRISE'],
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: 'advanced_fields' },
    update: {},
    create: {
      key: 'advanced_fields',
      name: 'Advanced Field Types',
      description: 'Enable advanced field types like dropdowns and radio buttons',
      enabled: true,
      enabledForAll: false,
      enabledPlanTiers: ['PROOF', 'ENTERPRISE'],
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: 'bulk_send' },
    update: {},
    create: {
      key: 'bulk_send',
      name: 'Bulk Document Sending',
      description: 'Send documents to multiple recipients at once',
      enabled: false,
      enabledForAll: false,
      enabledPlanTiers: ['ENTERPRISE'],
    },
  });

  console.log('Seeded Users:');
  console.log(`  - Super Admin: ${superAdmin.email} (password: SuperAdmin2024!)`);
  console.log(`  - Admin: ${admin.email} (password: Traza2024!)`);
  console.log(`  - Signer: ${signer.email} (password: Traza2024!)`);
  console.log('');
  console.log('Seeded Organizations:');
  console.log(`  - ${adminOrg.name} (${adminOrg.slug}) - ${adminOrg.planTier}`);
  console.log(`  - ${demoOrg.name} (${demoOrg.slug}) - ${demoOrg.planTier}`);
  console.log('');
  console.log('Seeded Document:');
  console.log(`  - ${document.title} [${document.status}]`);
  console.log('');
  console.log('Seeded Feature Flags:');
  console.log(`  - blockchain_anchoring, advanced_fields, bulk_send`);
  console.log('');
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

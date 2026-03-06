/**
 * Data Migration: Convert existing users to organization-based ownership
 *
 * This script:
 * 1. Creates a personal organization for each existing user
 * 2. Adds the user as OWNER of their organization
 * 3. Migrates all user documents to their organization
 * 4. Sets platformRole to USER for all users (manually promote admins later)
 *
 * Run: pnpm tsx prisma/migrations/migrate-to-organizations.ts
 */

import { PrismaClient, PlanTier, OrgStatus, OrgRole, PlatformRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting organization migration...\n');

  // Get all users
  const users = await prisma.user.findMany({
    include: {
      documents: true,
    },
  });

  console.log(`📊 Found ${users.length} users to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      console.log(`\n👤 Migrating user: ${user.email} (${user.name})`);

      // Check if user already has an organization membership
      const existingMembership = await prisma.orgMembership.findFirst({
        where: { userId: user.id },
      });

      if (existingMembership) {
        console.log(`  ⏭️  User already has organization membership, skipping...`);
        continue;
      }

      // Create personal organization
      const orgName = `${user.name}'s Organization`;
      const orgSlug = user.id; // Use user ID as unique slug

      console.log(`  📁 Creating organization: ${orgName}`);

      const organization = await prisma.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          status: OrgStatus.ACTIVE,
          planTier: user.planTier || PlanTier.FREE,
          logoUrl: user.brandingLogoUrl,
          primaryColor: user.brandingColor || '#000000',
        },
      });

      console.log(`  ✅ Organization created: ${organization.id}`);

      // Create membership with OWNER role
      console.log(`  👑 Adding user as OWNER of organization`);

      await prisma.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrgRole.OWNER,
        },
      });

      console.log(`  ✅ Membership created`);

      // Migrate all user documents to organization
      const documentCount = user.documents.length;
      if (documentCount > 0) {
        console.log(`  📄 Migrating ${documentCount} documents to organization...`);

        await prisma.document.updateMany({
          where: { ownerId: user.id },
          data: {
            organizationId: organization.id,
            createdById: user.id,
          },
        });

        console.log(`  ✅ Documents migrated`);
      } else {
        console.log(`  📄 No documents to migrate`);
      }

      // Update user platform role (keep as USER, manually promote admins later)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          platformRole: PlatformRole.USER,
        },
      });

      successCount++;
      console.log(`  ✅ User migration completed successfully`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error migrating user ${user.email}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Migration completed!`);
  console.log(`   Success: ${successCount} users`);
  console.log(`   Errors:  ${errorCount} users`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n⚠️  Some users failed to migrate. Review errors above.');
  }

  console.log('\n📋 Next steps:');
  console.log('  1. Verify migrations in database');
  console.log('  2. Manually promote admin users:');
  console.log(`     UPDATE "User" SET "platformRole" = 'SUPER_ADMIN' WHERE email = 'admin@example.com';`);
  console.log('  3. Test login and organization access');
  console.log('  4. Deploy frontend changes');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('\n❌ Migration failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

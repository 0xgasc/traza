/**
 * Data Migration Script: Migrate Users to Organizations
 *
 * This script:
 * 1. Creates a personal organization for each existing user
 * 2. Migrates documents from ownerId to organizationId
 * 3. Sets the user as OWNER of their personal organization
 *
 * Run with: npx tsx prisma/migrations/migrate-to-organizations.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(email: string): string {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);

  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

async function main() {
  console.log('Starting organization migration...\n');

  // Get all existing users
  const users = await prisma.user.findMany({
    include: {
      documents: true,
      memberships: true,
    },
  });

  console.log(`Found ${users.length} users to migrate\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      // Skip users who already have organizations
      if (user.memberships.length > 0) {
        console.log(`[SKIP] ${user.email} - Already has ${user.memberships.length} organization(s)`);
        skippedCount++;
        continue;
      }

      console.log(`[MIGRATE] ${user.email}`);

      // Create personal organization for the user
      const orgSlug = generateSlug(user.email);
      const orgName = user.name ? `${user.name}'s Workspace` : 'My Workspace';

      const organization = await prisma.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          status: 'ACTIVE',
          planTier: user.planTier,
          billingEmail: user.email,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });

      console.log(`  Created organization: ${organization.slug} (${organization.id})`);

      // Migrate documents to the organization
      if (user.documents.length > 0) {
        await prisma.document.updateMany({
          where: { ownerId: user.id },
          data: {
            organizationId: organization.id,
            createdById: user.id,
          },
        });

        console.log(`  Migrated ${user.documents.length} document(s)`);
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          organizationId: organization.id,
          eventType: 'migration.user_to_org',
          resourceType: 'User',
          resourceId: user.id,
          metadata: {
            originalPlanTier: user.planTier,
            documentsCount: user.documents.length,
            migrationDate: new Date().toISOString(),
          },
        },
      });

      migratedCount++;
      console.log(`  [OK] Migration complete\n`);
    } catch (error) {
      console.error(`  [ERROR] Failed to migrate ${user.email}:`, error);
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log('Migration Summary:');
  console.log(`  Migrated: ${migratedCount}`);
  console.log(`  Skipped:  ${skippedCount}`);
  console.log(`  Errors:   ${errorCount}`);
  console.log('========================================\n');

  if (errorCount > 0) {
    console.log('WARNING: Some users failed to migrate. Please review the errors above.');
    process.exit(1);
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

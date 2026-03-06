import { PrismaClient, PlatformRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@traza.dev';

  console.log(`Promoting ${email} to SUPER_ADMIN...`);

  const updated = await prisma.user.update({
    where: { email },
    data: { platformRole: PlatformRole.SUPER_ADMIN },
    select: { id: true, email: true, name: true, platformRole: true },
  });

  console.log('✅ Success!');
  console.log(JSON.stringify(updated, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });

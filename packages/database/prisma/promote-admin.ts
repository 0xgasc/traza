import { PrismaClient, PlatformRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@traza.dev';
  const newPassword = 'Admin123!'; // Default password - change after first login

  console.log(`Promoting ${email} to SUPER_ADMIN and resetting password...`);

  // Hash the password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({
    where: { email },
    data: {
      platformRole: PlatformRole.SUPER_ADMIN,
      passwordHash: hashedPassword,
    },
    select: { id: true, email: true, name: true, platformRole: true },
  });

  console.log('✅ Success!');
  console.log(JSON.stringify(updated, null, 2));
  console.log(`\n🔐 Credentials:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${newPassword}`);
  console.log(`   ⚠️  Change this password after first login!`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@traza.dev';
  const newPassword = 'Admin123!'; // Change this to whatever you want

  console.log(`Resetting password for ${email}...`);

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update the user's password
  const updated = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
    select: { id: true, email: true, name: true },
  });

  console.log('✅ Password reset successfully!');
  console.log(JSON.stringify(updated, null, 2));
  console.log(`\nNew credentials:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${newPassword}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });

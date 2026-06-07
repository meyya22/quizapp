import 'dotenv/config';
import app from './app';
import { prisma } from './config/prisma';

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Backfill: any participant with at least one category purchase should be PAID
  try {
    const result = await prisma.$executeRaw`
      UPDATE "User"
      SET tier = 'PAID'
      WHERE role = 'PARTICIPANT'
        AND tier = 'FREE'
        AND id IN (
          SELECT DISTINCT "userId" FROM "CategoryPurchase"
        )
    `;
    if (result > 0) console.log(`Backfilled ${result} participant(s) to PAID tier`);
  } catch (err) {
    console.error('Tier backfill error:', err);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

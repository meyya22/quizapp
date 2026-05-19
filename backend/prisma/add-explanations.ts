import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    where: { explanation: null },
    include: { quiz: { select: { title: true } } },
  });

  if (questions.length === 0) {
    console.log('All questions already have explanations.');
    return;
  }

  const explanationMap: Record<string, string> = {
    'What is 7 × 8?':
      '7 × 8 = 56. A quick trick: 7 × 8 = 7 × (4 × 2) = 28 × 2 = 56.',
    'Is π (pi) an irrational number?':
      'Yes — π cannot be expressed as a fraction of two integers. Its decimal expansion is infinite and non-repeating.',
    'Which of the following are prime numbers?':
      'A prime number has exactly two factors: 1 and itself. 2 and 7 are prime; 4 = 2×2 and 9 = 3×3 are not.',
    'What is the square root of 144?':
      '12 × 12 = 144, so √144 = 12.',
  };

  let updated = 0;
  for (const q of questions) {
    const explanation = explanationMap[q.text];
    if (explanation) {
      await prisma.question.update({
        where: { id: q.id },
        data: { explanation },
      });
      console.log(`  ✓ "${q.text.slice(0, 50)}"`);
      updated++;
    }
  }

  console.log(`\nUpdated ${updated} of ${questions.length} questions with explanations.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

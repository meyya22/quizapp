import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@quizapp.com' },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('AdminSecurePassword123', 12);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@quizapp.com',
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log('Admin user created: admin@quizapp.com / AdminSecurePassword123');
  } else {
    console.log('Admin user already exists');
  }

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const math = await prisma.category.create({
      data: { name: 'Mathematics', description: 'Numbers, algebra, geometry and more' },
    });
    const science = await prisma.category.create({
      data: { name: 'Science', description: 'Physics, chemistry, biology' },
    });

    const quiz = await prisma.quiz.create({
      data: {
        categoryId: math.id,
        title: 'Basic Arithmetic',
        description: 'Test your knowledge of basic math operations',
        passingScore: 70,
      },
    });

    await prisma.question.createMany({
      data: [
        {
          quizId: quiz.id,
          text: 'What is 7 × 8?',
          type: 'MULTIPLE_CHOICE',
          options: JSON.stringify({ A: '54', B: '56', C: '58', D: '64' }),
          correctAnswer: JSON.stringify('B'),
          explanation: '7 × 8 = 56. A quick trick: 7 × (4 × 2) = 28 × 2 = 56.',
          orderIndex: 0,
        },
        {
          quizId: quiz.id,
          text: 'Is π (pi) an irrational number?',
          type: 'TRUE_FALSE',
          options: null,
          correctAnswer: JSON.stringify('true'),
          explanation: 'π cannot be expressed as a fraction of two integers. Its decimal expansion is infinite and non-repeating.',
          orderIndex: 1,
        },
        {
          quizId: quiz.id,
          text: 'Which of the following are prime numbers?',
          type: 'MULTIPLE_RESPONSE',
          options: JSON.stringify({ A: '2', B: '4', C: '7', D: '9' }),
          correctAnswer: JSON.stringify(['A', 'C']),
          explanation: 'A prime has exactly two factors: 1 and itself. 2 and 7 qualify; 4 = 2×2 and 9 = 3×3 do not.',
          orderIndex: 2,
        },
        {
          quizId: quiz.id,
          text: 'What is the square root of 144?',
          type: 'FREE_TEXT',
          options: null,
          correctAnswer: JSON.stringify('12'),
          explanation: '12 × 12 = 144, so √144 = 12.',
          orderIndex: 3,
        },
      ],
    });

    await prisma.quiz.create({
      data: {
        categoryId: science.id,
        title: 'Basic Physics',
        description: 'Fundamental physics concepts',
        passingScore: 60,
      },
    });

    console.log('Sample categories and quizzes created');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { globalLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import quizRoutes from './routes/quiz.routes';
import questionRoutes from './routes/question.routes';
import attemptRoutes from './routes/attempt.routes';
import userRoutes from './routes/user.routes';
import paymentRoutes from './routes/payment.routes';
import contactRoutes from './routes/contact.routes';
import supportRoutes from './routes/support.routes';
import aiRoutes from './routes/ai.routes';
import aiQuizRoutes from './routes/aiQuiz.routes';
import marketingContactRoutes from './routes/marketingContact.routes';
import emailConfigRoutes from './routes/emailConfig.routes';
import examContentRoutes from './routes/examContent.routes';
import upcomingExamRoutes from './routes/upcomingExam.routes';
import dbInfoRoutes from './routes/dbInfo.routes';
import pageVisitRoutes from './routes/pageVisit.routes';
import chatRoutes from './routes/chat.routes';
import { errorHandler, notFound } from './middleware/error';

const app = express();

// Trust Cloud Run's load balancer so express-rate-limit sees the real client IP
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Global rate limit: 200 requests per 15 min per IP
app.use(globalLimiter);

// Stripe + Razorpay webhooks require raw body — register before json parser
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payment/razorpay/webhook-rz', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/quizzes/:quizId/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-quiz', aiQuizRoutes);
app.use('/api/marketing-contacts', marketingContactRoutes);
app.use('/api/email-config', emailConfigRoutes);
app.use('/api/exam-content', examContentRoutes);
app.use('/api/upcoming-exams', upcomingExamRoutes);
app.use('/api/db-info', dbInfoRoutes);
app.use('/api/page-visits', pageVisitRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(notFound);
app.use(errorHandler);

export default app;

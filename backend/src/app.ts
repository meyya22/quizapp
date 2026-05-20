import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import quizRoutes from './routes/quiz.routes';
import questionRoutes from './routes/question.routes';
import attemptRoutes from './routes/attempt.routes';
import userRoutes from './routes/user.routes';
import paymentRoutes from './routes/payment.routes';
import contactRoutes from './routes/contact.routes';
import supportRoutes from './routes/support.routes';
import { errorHandler, notFound } from './middleware/error';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Stripe webhook requires raw body — register before json parser
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/quizzes/:quizId/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/support', supportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(notFound);
app.use(errorHandler);

export default app;

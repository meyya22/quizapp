import 'dotenv/config';
import app from './app';

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

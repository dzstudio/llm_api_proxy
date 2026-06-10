import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { config } from './config/index.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import apiKeyRoutes from './routes/apiKey.js';
import modelRoutes from './routes/model.js';
import llmRoutes from './routes/llm.js';
import conversationRoutes from './routes/conversation.js';
import reportRoutes from './routes/report.js';
import reviewRoutes from './routes/review.js';
import { seedAdmin } from './utils/seed.js';
import { startScheduler } from './scheduler/dailyReport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(authMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ code: 0, message: 'ok', data: { uptime: process.uptime() } });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const staticDir = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(staticDir));
  // SPA fallback: serve index.html for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  await seedAdmin();
  app.listen(config.port, () => {
    console.log(`[LLM API Proxy] Server running on http://localhost:${config.port}`);
    startScheduler();
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;

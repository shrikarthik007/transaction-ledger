import express from 'express';
import cors from 'cors';
import accountRoutes from './routes/account.routes';
import transactionRoutes from './routes/transaction.routes';
import transferRoutes from './routes/transfer.routes';
import docsRoutes from './routes/docs.routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/accounts', transactionRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/docs', docsRoutes);

// Unknown routes -> consistent JSON 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;


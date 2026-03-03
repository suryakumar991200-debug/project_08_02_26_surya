import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import uploadRoutes from './routes/upload.js';
import chatRoutes from './routes/chat.js';

await connectDB();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
// app.use(kjfjksj)
// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'OpsMind AI Backend is running. Use /health to check status.' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'OpsMind AI Backend' });
});

// Global error handler so errors don't crash the server
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: err.message || 'Something went wrong' });
});
//app.use('/api/user', userRoutes);
const PORT = parseInt(process.env.PORT, 10) || 5000;

function startServer(port) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 OpsMind AI backend running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server startup error:', err.message);
    }
  });
}

startServer(PORT);

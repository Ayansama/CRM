import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate';
import { isDbConnected } from './db/pool';
import importRouter from './routes/import';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin) or localhost
    if (!origin || origin.startsWith('http://localhost') || origin === frontendUrl) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
}));
app.options('/{*path}', cors()); // Handle preflight for all routes (Express 5 syntax)
app.use(express.json());

app.use('/api', importRouter);

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'GrowEasy CRM CSV Importer API',
    databaseConnected: isDbConnected(),
  });
});

const startServer = async () => {
  // Run database migrations on startup — warns on failure but always boots
  await runMigrations();

  app.listen(port, () => {
    console.log(`\n✅ Server running on http://localhost:${port}`);
    console.log(`   CORS origin: ${frontendUrl}`);
    console.log(`   Database connected: ${isDbConnected()}\n`);
  });
};

startServer();

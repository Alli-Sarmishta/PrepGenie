import dotenv from 'dotenv';

// Load environment variables FIRST, before anything else
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  server: {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Handle connection errors and reconnection
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Database connection error:', error);
  });

// Handle process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Utility function for retrying database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (error.code === 'P1017' || error.message?.includes('Closed')) {
        console.log(`Database connection lost, reconnecting... (attempt ${i + 1}/${retries})`);
        await prisma.$disconnect();
        await prisma.$connect();
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}

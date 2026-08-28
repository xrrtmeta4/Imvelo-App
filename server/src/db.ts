import { PrismaClient } from '@prisma/client';

// Single Prisma client for the whole server process.
export const prisma = new PrismaClient();

import { Prisma } from '@prisma/client';

/** True for Prisma's unique-constraint violation (P2002) — used for idempotency keys, references and event ids. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

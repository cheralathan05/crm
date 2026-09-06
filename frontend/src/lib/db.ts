import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  let url = process.env.DATABASE_URL ?? "file:./dev.db";

  // This project runs on SQLite (better-sqlite3 adapter). If DATABASE_URL
  // points at a non-SQLite engine (e.g. a leftover Postgres URL from another
  // project), the adapter would treat it as a file path and every DB query
  // would throw. Fall back to the bundled dev database and warn loudly.
  if (/^postgres(ql)?:\/\//i.test(url)) {
    console.warn(
      "[db] DATABASE_URL looks like a Postgres URL, but this app uses SQLite. " +
        "Falling back to \"file:./dev.db\". Update your .env DATABASE_URL to \"file:./dev.db\".",
    );
    url = "file:./dev.db";
  }

  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const cached = globalForPrisma.prisma;
export const db =
  cached && (cached as any)._schemaVersion === 7
    ? cached
    : (() => {
        const client = createClient();
        (client as any)._schemaVersion = 7;
        return client;
      })();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}


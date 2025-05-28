import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";

const dbPath = path.join(__dirname, "..", "..", "..", "database/", "db.sqlite");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

export { dbPath, db };

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";

import { users } from "./models/users";
import { departments } from "./models/departments";
import { documents } from "./models/documents";
import { documentLogs } from "./models/documentLog";

const dbPath = path.join(__dirname, "..", "..", "..", "database/", "db.sqlite");
const sqliteProvider = new Database(dbPath);
const db = drizzle({
	client: sqliteProvider,
	schema: { ...users, ...departments, ...documents, ...documentLogs },
});

export { dbPath, db, sqliteProvider };

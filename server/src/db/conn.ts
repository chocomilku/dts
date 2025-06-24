import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";

import { users } from "./models/users";
import { departments } from "./models/departments";
import { documents } from "./models/documents";
import { documentLogs } from "./models/documentLog";
import { feedbacks } from "./models/feedbacks";

const dbPath = path.join(process.cwd(), "../database/db.sqlite");
const sqliteProvider = new Database(dbPath);

const db = drizzle({
	client: sqliteProvider,
	schema: {
		...users,
		...departments,
		...documents,
		...documentLogs,
		...feedbacks,
	},
});

export { dbPath, db, sqliteProvider };

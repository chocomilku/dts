import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { documents } from "./documents";
import { departments } from "./departments";

export const documentLogs = sqliteTable("documentLogs", {
	id: int().primaryKey({ autoIncrement: true }),
	document: int()
		.references(() => documents.id)
		.notNull(),
	location: int()
		.references(() => departments.id)
		.notNull(),
	author: int()
		.references(() => users.id)
		.notNull(),
	recipient: int(),
	recipientType: text({ enum: ["user", "dept"] }),
	action: text({
		enum: [
			"created",
			"closed",
			"note",
			"transfer",
			"assign",
			"approve",
			"deny",
		],
	}).notNull(),
	details: text(),
	timestamp: text().default(sql`(CURRENT_TIMESTAMP)`),
});

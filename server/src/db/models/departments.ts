import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";

export const departments = sqliteTable("departments", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull().unique(),
	createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
});

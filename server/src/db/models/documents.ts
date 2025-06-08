import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const documents = sqliteTable("documents", {
	id: int().primaryKey({ autoIncrement: true }),
	trackingNumber: text().notNull().unique(),
	status: text({ enum: ["open", "closed"] }).notNull(),
	title: text().notNull(),
	details: text().notNull(),
	signatory: int().references(() => users.id),
	author: int().references(() => users.id),
	createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
	lastUpdatedAt: text().default(sql`(CURRENT_TIMESTAMP)`),
});

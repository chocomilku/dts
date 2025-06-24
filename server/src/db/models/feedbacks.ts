import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const feedbacks = sqliteTable("feedbacks", {
	id: int().primaryKey({ autoIncrement: true }),
	author: int().references(() => users.id),
	timestamp: text()
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
	feedback: text().notNull(),
});

export type Feedback = typeof feedbacks.$inferSelect;

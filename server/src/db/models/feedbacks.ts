import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { z } from "zod";
import { emptyString } from "@utils/emptyString";

export const feedbacks = sqliteTable("feedbacks", {
	id: int().primaryKey({ autoIncrement: true }),
	author: int().references(() => users.id),
	timestamp: text()
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
	feedback: text().notNull(),
});

export type Feedback = typeof feedbacks.$inferSelect;

export const zFeedback = z.object({
	feedback: z.preprocess(
		emptyString,
		z.string().min(1, "Feedback cannot be empty").max(1000, "Feedback too long")
	),
});

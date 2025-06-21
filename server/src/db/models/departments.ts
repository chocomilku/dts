import { emptyString } from "@utils/emptyString";
import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const departments = sqliteTable("departments", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull().unique(),
	description: text(),
	createdAt: text()
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
});

export type Department = typeof departments.$inferSelect;

export const zDepartments = z.object({
	name: z.preprocess(emptyString, z.string()),
	description: z.string().optional(),
});

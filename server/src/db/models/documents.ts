import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { z } from "zod";
import { emptyString } from "@utils/emptyString";

export const documents = sqliteTable("documents", {
	id: int().primaryKey({ autoIncrement: true }),
	trackingNumber: text().notNull().unique(),
	status: text({ enum: ["open", "closed"] }).notNull(),
	title: text().notNull(),
	type: text().notNull(),
	details: text().notNull(),
	signatory: int()
		.references(() => users.id)
		.notNull(),
	author: int()
		.references(() => users.id)
		.notNull(),
	createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
	lastUpdatedAt: text().default(sql`(CURRENT_TIMESTAMP)`),
});

export const zDocuments = z.object({
	title: z.preprocess(emptyString, z.string()),
	type: z.preprocess(emptyString, z.string()),
	details: z.preprocess(emptyString, z.string()),
	signatory: z.coerce.number(),
});

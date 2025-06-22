import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { z } from "zod/v4";
import { emptyString } from "@utils/emptyString";
import { departments } from "./departments";

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
	originDepartment: int()
		.references(() => departments.id)
		.notNull(),
	assignedUser: int().references(() => users.id),
	assignedDepartment: int().references(() => departments.id),
	createdAt: text()
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
	lastUpdatedAt: text().default(sql`(CURRENT_TIMESTAMP)`),
	dueAt: text(),
});

export type Doc = typeof documents.$inferSelect;

export const zDocuments = z.object({
	title: z.preprocess(emptyString, z.string()),
	type: z.preprocess(emptyString, z.string()),
	details: z.preprocess(emptyString, z.string()),
	signatory: z.coerce.number(),
	dueAt: z.iso.datetime().nullable().optional(),
});

export const zDocumentsStatus = z.object({
	status: z.enum(["open", "closed"]),
});

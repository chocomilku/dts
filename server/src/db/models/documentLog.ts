import { sql } from "drizzle-orm";
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { documents } from "./documents";
import { departments } from "./departments";
import { z } from "zod";

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
			"reopen",
			"note",
			"transfer",
			"receive",
			"assign",
			"approve",
			"deny",
		],
	}).notNull(),
	logMessage: text().notNull(),
	additionalDetails: text(),
	timestamp: text()
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
});

export type DocLog = typeof documentLogs.$inferSelect;

export const zDocumentLogs = z.object({
	action: z.enum([
		// created only available through POST /documents
		// closed only available through PATCH /documents/:id/status
		// reopen only available through PATCH /documents/:id/status
		"note",
		"transfer",
		"receive",
		"assign",
		"approve", // add check to limit only to signatory
		"deny", // add check to limit only to signatory
	]),
	recipient: z.coerce.number().optional(),
	recipientType: z.enum(["user", "dept"]).optional(),
	additionalDetails: z.string().optional(),
});

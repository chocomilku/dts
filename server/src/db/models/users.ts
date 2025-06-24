import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { departments } from "./departments";
import { z } from "zod/v4";
import { emptyString } from "@utils/emptyString";

export const users = sqliteTable("users", {
	id: int().primaryKey({ autoIncrement: true }),
	role: text({ enum: ["superadmin", "admin", "clerk", "officer"] }).notNull(),
	name: text().notNull(),
	departmentId: int()
		.references(() => departments.id)
		.notNull(),
	username: text().notNull().unique(),
	email: text().unique(),
	password: text().notNull(),
	createdAt: text()
		.default(sql`(CURRENT_TIMESTAMP)`)
		.notNull(),
});

export type User = typeof users.$inferSelect;

export const zUsers = z.object({
	role: z.enum(["superadmin", "admin", "clerk", "officer"]),
	name: z.preprocess(emptyString, z.string()),
	departmentId: z.coerce.number(),
	email: z.email().optional(),
	password: z.string(),
});

export const zLogin = z.object({
	username: z.preprocess(emptyString, z.string()),
	password: z.preprocess(emptyString, z.string()),
});

export const zForgotPassword = z.object({
	username: z.preprocess(emptyString, z.string()),
	email: z.preprocess(emptyString, z.email()),
});

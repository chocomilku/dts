import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { departments } from "./departments";
import { z } from "zod";

export const users = sqliteTable("users", {
	id: int().primaryKey({ autoIncrement: true }),
	role: text({ enum: ["superadmin", "admin", "clerk", "officer"] }).notNull(),
	name: text().notNull(),
	departmentId: int().references(() => departments.id),
	username: text().notNull().unique(),
	password: text().notNull(),
	birthdate: text().notNull(),
	createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
});

export const zUsers = z.object({
	role: z.enum(["superadmin", "admin", "clerk", "officer"]),
	name: z.string(),
	departmentId: z.coerce.number(),
	password: z.string(),
	birthdate: z.coerce.date(),
});

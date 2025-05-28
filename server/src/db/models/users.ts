import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { departments } from "./departments";

export const users = sqliteTable("users", {
	id: int().primaryKey({ autoIncrement: true }),
	role: text({ enum: ["superadmin", "admin", "clerk", "officer"] }).notNull(),
	name: text().notNull(),
	departmentId: int().references(() => departments.id),
	username: text().notNull(),
	password: text().notNull(),
	birthdate: text().notNull(),
	createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
});

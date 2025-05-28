import { db } from "@db/conn";
import {
	zDepartments,
	departments as departmentsModel,
} from "@db/models/departments";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { SQLiteError } from "bun:sqlite";

const departments = new Hono();

departments.post("/", zValidator("form", zDepartments), async (c) => {
	const validated = c.req.valid("form");

	try {
		const insertedData = await db
			.insert(departmentsModel)
			.values({
				name: validated.name,
			})
			.returning({ id: departmentsModel.id });

		c.status(201);
		return c.json({
			message: "Department Successfully Added!",
			insertedData,
		});
	} catch (e) {
		if (!(e instanceof SQLiteError)) {
			console.error(e);
			c.status(500);
			return c.json({ message: "Internal Server Error" });
		}

		// SQLITE_CONSTRAINT_UNIQUE
		if (e.errno == 2067) {
			c.status(409);
			return c.json({ message: "Department name already exists." });
		}
	}
});

export default departments;

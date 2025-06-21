import { db } from "@db/conn";
import {
	zDepartments,
	departments as departmentsModel,
} from "@db/models/departments";
import { users as usersModel } from "@db/models/users";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { SQLiteError } from "bun:sqlite";
import { sessionAuth } from "@middlewares/sessionAuth";
import { desc, getTableColumns, eq, count } from "drizzle-orm";
import { z } from "zod";

const departmentRouter = new Hono();

//#region department:id - GET
/**
 * Get a specific department by its ID.
 *
 * @route GET /:id
 * @access Authenticated users (any role)
 * @param {number} id - Department ID (URL parameter)
 * @returns {object} 200 - Department data
 * @returns {object} 404 - Department not found
 * @returns {object} 400 - Invalid ID
 * @returns {object} 500 - Internal Server Error
 */
departmentRouter.get("/:id", sessionAuth("any"), async (c) => {
	try {
		const { id } = c.req.param();
		const querySchema = z.object({
			id: z.coerce.number().int().positive(),
		});

		const parsedData = querySchema.safeParse({ id });

		if (!parsedData.success) {
			c.status(400);
			return c.json(parsedData.error);
		}

		const safeId = parsedData.data.id;
		const { ...deptsRest } = getTableColumns(departmentsModel);

		const data = await db
			.select({ ...deptsRest })
			.from(departmentsModel)
			.where(eq(departmentsModel.id, safeId))
			.limit(1);

		if (data.length !== 1) {
			c.status(404);
			return c.json({ message: "Department not found." });
		}

		c.status(200);
		return c.json({ message: "OK", data });
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

//#region departments - GET ALL
departmentRouter.get("/", sessionAuth("any"), async (c) => {
	try {
		const { id, name, createdAt } = getTableColumns(departmentsModel);

		const data = await db
			.select({ id, name, createdAt, members: count(usersModel.departmentId) })
			.from(departmentsModel)
			.leftJoin(usersModel, eq(departmentsModel.id, usersModel.departmentId))
			.groupBy(departmentsModel.id)
			.orderBy(desc(departmentsModel.id));

		c.status(200);
		return c.json({ message: "OK", data });
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

//#region departments - POST
departmentRouter.post(
	"/",
	sessionAuth(["superadmin"]),
	zValidator("form", zDepartments),
	async (c) => {
		const validated = c.req.valid("form");

		try {
			const insertedData = await db
				.insert(departmentsModel)
				.values({
					name: validated.name,
					description: validated.description,
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
			// best to use switch case here if it gottten big
			if (e.errno == 2067) {
				c.status(409);
				return c.json({ message: "Department name already exists." });
			}
		}
	}
);
//#endregion

export default departmentRouter;

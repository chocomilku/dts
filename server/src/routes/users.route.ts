import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { zUsers, users as usersModel } from "@db/models/users";
import { db } from "@db/conn";
import { SQLiteError } from "bun:sqlite";
import { usernameProvider } from "@utils/usernameProvider";

const users = new Hono();

//#region users - POST
users.post("/", zValidator("form", zUsers), async (c) => {
	const validated = c.req.valid("form");

	const passwordHash = await Bun.password.hash(validated.password);

	try {
		const insertedId = await db
			.insert(usersModel)
			.values({
				role: validated.role,
				name: validated.name,
				departmentId: validated.departmentId,
				username: await usernameProvider(),
				password: passwordHash,
				birthdate: validated.birthdate.toISOString(),
			})
			.returning({ id: usersModel.id, username: usersModel.username });

		c.status(201);
		return c.json({
			message: "User Successfully Added!",
			insertedData: insertedId,
		});
	} catch (e) {
		if (!(e instanceof SQLiteError)) {
			console.error(e);
			c.status(500);
			return c.json({ message: "Internal Server Error" });
		}
	}
});
//#endregion

export default users;

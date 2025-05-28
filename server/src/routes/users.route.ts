import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { zUsers, users as usersModel } from "@db/models/users";
import { db } from "@db/conn";

const users = new Hono();

//#region users - POST
users.post("/", zValidator("form", zUsers), async (c) => {
	const validated = c.req.valid("form");

	const passwordHash = await Bun.password.hash(validated.password);

	const insertedId = await db
		.insert(usersModel)
		.values({
			role: validated.role,
			name: validated.name,
			departmentId: validated.departmentId,
			username: validated.username,
			password: passwordHash,
			birthdate: validated.birthdate.toISOString(),
		})
		.returning({ insertedId: usersModel.id });

	c.status(201);
	return c.json({ message: "User Successfully Added!", ...insertedId });
});
//#endregion

export default users;

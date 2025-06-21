import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { zUsers, users as usersModel } from "@db/models/users";
import { db } from "@db/conn";
import { SQLiteError } from "bun:sqlite";
import { usernameProvider } from "@utils/usernameProvider";
import { z } from "zod";
import { eq, getTableColumns } from "drizzle-orm";
import {
	Department,
	departments as departmentsModel,
} from "@db/models/departments";
import { sessionAuth, SessionAuthVariables } from "@middlewares/sessionAuth";

type Variables = {} & SessionAuthVariables;

const userRouter = new Hono<{ Variables: Variables }>();

//#region users - GET ALL
userRouter.get("/", sessionAuth("any"), async (c) => {
	try {
		const { limit, offset, department } = c.req.query();
		const querySchema = z.object({
			limit: z.coerce.number().int().positive().max(50).default(10).catch(10),
			offset: z.coerce.number().int().nonnegative().default(0).catch(0),
			departmentId: z.coerce.number().optional().catch(undefined),
		});

		const parsedData = querySchema.safeParse({
			limit,
			offset,
			departmentId: department,
		});

		if (!parsedData.success) {
			c.status(400);
			return c.json(parsedData.error);
		}

		const { password, username, departmentId, ...usersRest } =
			getTableColumns(usersModel);
		const { createdAt, ...deptRest } = getTableColumns(departmentsModel);

		const data = await db
			.select({ ...usersRest, department: deptRest })
			.from(usersModel)
			.leftJoin(
				departmentsModel,
				eq(usersModel.departmentId, departmentsModel.id)
			)
			.limit(parsedData.data.limit)
			.offset(parsedData.data.offset)
			.where(
				parsedData.data.departmentId
					? eq(usersModel.departmentId, parsedData.data.departmentId)
					: undefined
			);

		const count = await db.$count(usersModel);

		c.status(200);
		return c.json({ message: "OK", count, data });
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

//#region user @me - GET
userRouter.get("/@me", sessionAuth("any"), async (c) => {
	try {
		const user = c.get("user");

		const { id, name } = getTableColumns(departmentsModel);

		const userDepartment = await db
			.select({ id, name })
			.from(departmentsModel)
			.where(eq(departmentsModel.id, user.departmentId))
			.limit(1);

		let department = userDepartment.length != 1 ? null : userDepartment[0];

		const { departmentId: _, ...userRest } = user;
		const data = { ...userRest, department };

		c.status(200);
		return c.json({ message: "OK", data });
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

//#region user:id - GET
userRouter.get("/:id", sessionAuth("any"), async (c) => {
	try {
		const { id } = c.req.param();
		const querySchema = z.object({
			id: z.coerce.number().int().positive(),
		});

		const parsedData = querySchema.safeParse({
			id,
		});

		if (!parsedData.success) {
			c.status(400);
			return c.json(parsedData.error);
		}

		const safeId = parsedData.data.id;

		const { password, username, departmentId, ...usersRest } =
			getTableColumns(usersModel);
		const { createdAt, ...deptRest } = getTableColumns(departmentsModel);

		const data = await db
			.select({ ...usersRest, department: deptRest })
			.from(usersModel)
			.leftJoin(
				departmentsModel,
				eq(usersModel.departmentId, departmentsModel.id)
			)
			.limit(1)
			.where(eq(usersModel.id, safeId));

		if (data.length != 1) {
			c.status(404);
			return c.json({ message: "User not found." });
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

//#region users - POST
userRouter.post("/", zValidator("form", zUsers), async (c) => {
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

//#region user - PUT
userRouter.put(
	"/:id",
	sessionAuth("any"),
	zValidator("form", zUsers.partial()),
	async (c) => {
		const validatedForm = c.req.valid("form");
		const { id } = c.req.param();
		const requester = c.get("user");

		const querySchema = z.coerce.number().int().positive();
		const parsedData = querySchema.safeParse(id);

		if (!parsedData.success) {
			c.status(400);
			return c.json(parsedData.error);
		}

		const targetUserId = parsedData.data;
		let newPasswordHash = undefined;

		if (validatedForm?.password) {
			newPasswordHash = await Bun.password.hash(validatedForm.password);
		}

		try {
			const { role, departmentId } = getTableColumns(usersModel);

			// fetch target user
			const targetUserData = await db
				.select({ departmentId })
				.from(usersModel)
				.limit(1)
				.where(eq(usersModel.id, targetUserId));

			if (targetUserData.length !== 1) {
				c.status(404);
				return c.json({ message: "Target user not found." });
			}

			const targetUser = targetUserData[0];

			// admin can only edit members of their department
			if (requester.role == "admin") {
				if (targetUser.departmentId != requester.departmentId) {
					c.status(403);
					return c.json({
						message: "Admins can only edit users in their department.",
					});
				}
			} else if (requester.role == "clerk" || requester.role == "officer") {
				if (requester.id != targetUserId) {
					c.status(403);
					return c.json({ message: "You can only edit your own data." });
				}
			}

			if (requester.role != "superadmin") {
				if (
					validatedForm?.role != undefined ||
					validatedForm?.departmentId != undefined
				) {
					c.status(403);
					return c.json({
						message:
							"'Role' and 'Department' can only be edited with superadmin role",
					});
				}
			}

			await db
				.update(usersModel)
				.set({
					role: validatedForm?.role,
					name: validatedForm?.name,
					departmentId: validatedForm?.departmentId,
					password: newPasswordHash,
				})
				.where(eq(usersModel.id, targetUserId));

			c.status(204);
			return c.json({});
		} catch (e) {
			console.error(e);
			c.status(500);
			return c.json({ message: "Internal Server Error" });
		}
	}
);

//#endregion

export default userRouter;

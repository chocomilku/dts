import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { SessionAuthVariables, sessionAuth } from "@middlewares/sessionAuth";
import { zFeedback, feedbacks as feedbacksModel } from "@db/models/feedbacks";
import { db } from "@db/conn";
import { z } from "zod";
import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import { users as usersModel } from "@db/models/users";
import { departments as departmentsModel } from "@db/models/departments";

type Variables = {} & SessionAuthVariables;

const feedbacksRouter = new Hono<{ Variables: Variables }>();

//#region feedbacks - GET ALL
feedbacksRouter.get("/", sessionAuth(["superadmin", "admin"]), async (c) => {
	try {
		const { limit, offset, sort } = c.req.query();

		// Query schema for validation and default values
		const querySchema = z.object({
			limit: z.coerce.number().int().positive().max(50).default(10).catch(10),
			offset: z.coerce.number().int().nonnegative().default(0).catch(0),
			sort: z.enum(["newest", "oldest"]).default("newest").catch("newest"),
		});

		const parsedData = querySchema.safeParse({
			limit,
			offset,
			sort,
		});

		if (!parsedData.success) {
			c.status(400);
			return c.json(parsedData.error);
		}

		const { author, ...feedbackRest } = getTableColumns(feedbacksModel);
		const { createdAt, email, password, ...usersRest } =
			getTableColumns(usersModel);

		// Get data with join
		const data = await db
			.select({ ...feedbackRest, author: usersRest })
			.from(feedbacksModel)
			.leftJoin(usersModel, eq(feedbacksModel.author, usersModel.id));

		const count = await db.$count(feedbacksModel);

		c.status(200);
		return c.json({
			message: "OK",
			count,
			data: data,
			pagination: {
				total: count,
				limit: parsedData.data.limit,
				offset: parsedData.data.offset,
				pageCount: Math.ceil(count / parsedData.data.limit),
				currentPage:
					Math.floor(parsedData.data.offset / parsedData.data.limit) + 1,
			},
		});
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

//#region feedback - GET ONE
feedbacksRouter.get("/:id", sessionAuth(["superadmin", "admin"]), async (c) => {
	try {
		const { id } = c.req.param();

		// ID validation
		const idSchema = z.coerce.number().int().positive();
		const parsedId = idSchema.safeParse(id);

		if (!parsedId.success) {
			c.status(400);
			return c.json({ message: "Invalid feedback ID" });
		}

		const { author, ...feedbackRest } = getTableColumns(feedbacksModel);
		const { createdAt, email, password, ...usersRest } =
			getTableColumns(usersModel);

		// Get data with join
		const data = await db
			.select({ ...feedbackRest, author: usersRest })
			.from(feedbacksModel)
			.leftJoin(usersModel, eq(feedbacksModel.author, usersModel.id))
			.where(eq(feedbacksModel.id, parsedId.data))
			.limit(1);

		if (data.length !== 1) {
			c.status(404);
			return c.json({ message: "Feedback not found" });
		}

		const result = data[0];

		c.status(200);
		return c.json({ message: "OK", data: [result] });
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

//#region feedback - POST
feedbacksRouter.post(
	"/",
	sessionAuth("any"),
	zValidator("form", zFeedback),
	async (c) => {
		try {
			const user = c.get("user");
			const form = c.req.valid("form");

			const result = await db
				.insert(feedbacksModel)
				.values({
					author: user.id,
					feedback: form.feedback,
				})
				.returning({
					id: feedbacksModel.id,
				});

			c.status(201);
			return c.json({
				message: "Feedback submitted successfully",
				data: result,
			});
		} catch (e) {
			console.error(e);
			c.status(500);
			return c.json({ message: "Internal Server Error" });
		}
	}
);
//#endregion

export default feedbacksRouter;

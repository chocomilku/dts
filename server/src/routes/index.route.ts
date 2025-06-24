import { Hono } from "hono";
import { eq, and, getTableColumns } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { db } from "@db/conn";
import { users as usersModel, zForgotPassword, zLogin } from "@db/models/users";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createSession, destroySession } from "@utils/sessionProvider";
import { sessionAuth, SessionAuthVariables } from "@middlewares/sessionAuth";
import { createToken } from "@utils/passwordTokenProvider";

type Variables = {} & SessionAuthVariables;

const indexRouter = new Hono<{ Variables: Variables }>();

//#region Index - GET
indexRouter.get("/", (c) => {
	c.status(200);
	return c.json({ message: "OK!" });
});
//#endregion

//#region Check - [ANY] GET
indexRouter.get("/check", sessionAuth("any"), async (c) => {
	const user = c.get("user");
	c.status(200);
	return c.json({ message: "Authenticated", userId: user.id });
});
//#endregion

//#region Forgot Password - POST

/**
 * Forgot Password endpoint for requesting to reset their own password
 * if username and/or email are incorrect/not found, no reset token will be sent.
 */
indexRouter.post(
	"/forgot-password",
	zValidator("form", zForgotPassword, (result, c) => {
		if (!result.success) {
			c.status(400);
			return c.json({
				message: "Invalid Request Body",
			});
		}
	}),
	async (c) => {
		const form = c.req.valid("form");

		const { id, username, email } = getTableColumns(usersModel);

		const queryUser = await db
			.select({ id, username, email })
			.from(usersModel)
			.where(
				and(
					eq(usersModel.username, form.username),
					eq(usersModel.email, form.email)
				)
			);

		if (queryUser.length == 1) {
			const resetToken = await createToken(queryUser[0].id);
			// TODO: implement mail function here

			console.log(`Reset token for: ${queryUser[0].username}: ${resetToken}`);
		}

		c.status(202);
		return c.json({ message: "Reset Password request has been received." });
	}
);

//#endregion

//#region Login - POST
indexRouter.post("/login", zValidator("form", zLogin), async (c) => {
	const validated = c.req.valid("form");

	const { username, password, id } = getTableColumns(usersModel);

	const user = await db
		.select({ id, username, password })
		.from(usersModel)
		.limit(1)
		.where(eq(usersModel.username, validated.username));

	if (user.length !== 1) {
		c.status(401);
		return c.json({ message: "Invalid Username or Password." });
	}

	const isMatch = await Bun.password.verify(
		validated.password,
		user[0].password
	);

	if (!isMatch) {
		c.status(401);
		return c.json({ message: "Invalid Username or Password." });
	}

	// session
	const sessionId = await createSession(user[0].id);

	setCookie(c, "dts.sid", sessionId, {
		path: "/",
		secure: process.env.NODE_ENV == "production" ? true : false, // set to true when on prod (https only)
		maxAge: 86400,
		sameSite: "Strict",
		httpOnly: true,
	});

	c.status(200);
	return c.json({ message: "Successfully Logged in!" });
});
//#endregion

//#region Logout - POST
indexRouter.post("/logout", sessionAuth("any"), async (c) => {
	const cookie = getCookie(c, "dts.sid");
	if (cookie) {
		await destroySession(cookie);
		deleteCookie(c, "dts.sid");
	}

	c.status(204);
	return c.json({});
});
//#endregion

export default indexRouter;

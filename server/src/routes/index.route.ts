import { Hono } from "hono";
import { eq, getTableColumns } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { db } from "@db/conn";
import { users as usersModel, zLogin } from "@db/models/users";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createSession, destroySession } from "@utils/sessionProvider";
import { sessionAuth } from "@middlewares/sessionAuth";

type Variables = {
	userId: number; // from sessionAuth
};

const indexRouter = new Hono<{ Variables: Variables }>();

//#region Index - GET
indexRouter.get("/", (c) => {
	c.status(200);
	return c.json({ message: "OK!" });
});
//#endregion

//#region Check - GET [ANY]
indexRouter.get("/check", sessionAuth("any"), async (c) => {
	const id = c.get("userId");
	c.status(200);
	return c.json({ message: "Authenticated", userId: id });
});
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
		secure: false, // set to true when on prod (https only)
		maxAge: 86400,
		sameSite: "Strict",
		httpOnly: true,
	});

	c.status(200);
	return c.json({ message: "Successfully Logged in!" });
});
//#endregion

//#region Logout - POST
indexRouter.post("/logout", async (c) => {
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

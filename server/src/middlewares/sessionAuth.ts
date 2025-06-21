import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { getSession } from "@utils/sessionProvider";
import { db } from "@db/conn";
import { User, users as usersModel } from "@db/models/users";
import { eq, getTableColumns } from "drizzle-orm";

type Roles = "superadmin" | "admin" | "clerk" | "officer";

export type SessionAuthVariables = {
	user: Omit<User, "password">;
};

export const sessionAuth = (role: "any" | Roles[]) => {
	return createMiddleware(async (c, next) => {
		const cookie = getCookie(c, "dts.sid");
		if (!cookie) {
			c.status(401);
			return c.json({ message: "Not Authenticated" });
		}

		const userId = await getSession(cookie);
		if (userId == null) {
			c.status(401);
			return c.json({ message: "Session Expired" });
		}

		const { password, ...userRest } = getTableColumns(usersModel);

		const user = await db
			.select({ ...userRest })
			.from(usersModel)
			.where(eq(usersModel.id, userId))
			.limit(1);

		// cases where user account is deleted while still logged in
		// from 403 -> 404 since user will be passed around through different route definitions.
		if (user.length !== 1) {
			c.status(404);
			return c.json({ message: "User not found" });
		}

		if (role == "any") {
			c.set("user", user);
			await next();
		} else {
			if (!role.includes(user[0].role as Roles)) {
				c.status(403);
				return c.json({ message: "Forbidden" });
			}

			c.set("user", user);
			await next();
		}
	});
};

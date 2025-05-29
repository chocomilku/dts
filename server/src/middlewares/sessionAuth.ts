import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { getSession } from "@utils/sessionProvider";
import { db } from "@db/conn";
import { users as usersModel } from "@db/models/users";
import { eq, getTableColumns } from "drizzle-orm";

type Roles = "superadmin" | "admin" | "clerk" | "officer";

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

		if (role == "any") {
			c.set("userId", userId);
			await next();
		} else {
			const { role: roleCol } = getTableColumns(usersModel);

			const userRole = await db
				.select({ role: roleCol })
				.from(usersModel)
				.where(eq(usersModel.id, userId))
				.limit(1);

			// cases where user account is deleted while still logged in
			if (userRole.length !== 1) {
				c.status(403);
				return c.json({ message: "Account no longer active" });
			}

			if (!role.includes(userRole[0].role as Roles)) {
				c.status(403);
				return c.json({ message: "Forbidden" });
			}

			c.set("userId", userId);
			await next();
		}
	});
};

import { Context } from "hono";

export const usersController = (c: Context) => {
	c.status(200);
	return c.json({ message: "test" });
};

import { Context } from "hono";

export const getUsersController = (c: Context) => {
	c.status(200);
	return c.json({ message: "test" });
};

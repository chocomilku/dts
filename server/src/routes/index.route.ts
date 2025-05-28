import { Hono } from "hono";

const indexRouter = new Hono();

indexRouter.get("/", (c) => {
	c.status(200);
	return c.json({ message: "OK!" });
});

export default indexRouter;

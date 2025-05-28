import { Hono } from "hono";
import routes from "@routes/index.route";

const app = new Hono();

app.get("/", (c) => {
	c.status(200);
	return c.json({ message: "OK" });
});

app.route("/api", routes);

export default app;

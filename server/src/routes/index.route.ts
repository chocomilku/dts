import { Hono } from "hono";
import users from "./users.route";
import departments from "./departments.route";

const routes = new Hono();

routes.route("/users", users);
routes.route("/departments", departments);

routes.get("/", (c) => {
	c.status(200);
	return c.json({ message: "OK!" });
});

export default routes;

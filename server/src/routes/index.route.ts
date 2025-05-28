import { Hono } from "hono";
import users from "./users.route";
import departments from "./departments.route";

const routes = new Hono();

routes.route("/users", users);
routes.route("/departments", departments);

export default routes;

import { Hono } from "hono";
import indexRouter from "./index.route";
import users from "./users.route";
import departments from "./departments.route";

const routes = new Hono();

routes.route("/", indexRouter);
routes.route("/users", users);
routes.route("/departments", departments);

export default routes;

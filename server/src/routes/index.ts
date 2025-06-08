import { Hono } from "hono";
import indexRouter from "./index.route";
import userRouter from "./users.route";
import departmentRouter from "./departments.route";
import documentRouter from "./documents.route";

const routes = new Hono();

routes.route("/", indexRouter);
routes.route("/users", userRouter);
routes.route("/departments", departmentRouter);
routes.route("/documents", documentRouter);

export default routes;

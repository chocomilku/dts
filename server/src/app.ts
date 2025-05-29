import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { poweredBy } from "hono/powered-by";

import routes from "@routes/index";

const app = new Hono();

app.use(poweredBy());
app.use(secureHeaders());
app.use(logger());

// routes
app.route("/api", routes);

console.log("Routes: ");
showRoutes(app, { verbose: false, colorize: true });
console.log("\n");

export default app;

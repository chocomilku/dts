import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { poweredBy } from "hono/powered-by";
import { cors } from "hono/cors";

import routes from "@routes/index";

const app = new Hono();

app.use(poweredBy());
app.use(secureHeaders());
app.use(logger());

if (process.env.NODE_ENV != "production") {
	app.use(
		"*",
		cors({
			origin: "http://localhost:5500",
			credentials: true,
			allowHeaders: ["http://localhost:5500"],
		})
	);
}

// routes
app.route("/api", routes);

console.log("Routes: ");
showRoutes(app, { verbose: false, colorize: true });
console.log("\n");

export default app;

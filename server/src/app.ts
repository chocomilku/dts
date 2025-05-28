import { Hono } from "hono";
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

export default app;

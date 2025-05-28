import { defineConfig } from "drizzle-kit";
import { dbPath } from "./src/db/conn";

export default defineConfig({
	dialect: "sqlite",
	schema: "./src/db/models/*",
	out: "./src/db/migration",
	dbCredentials: {
		url: dbPath,
	},
});

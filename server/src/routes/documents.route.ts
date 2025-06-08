import { SQLiteError } from "bun:sqlite";
import { Hono } from "hono";
import { sessionAuth } from "@middlewares/sessionAuth";
import { zValidator } from "@hono/zod-validator";
import { documents as documentsModel, zDocuments } from "@db/models/documents";
import { db } from "@db/conn";
import { trackingNumberProvider } from "@utils/trackingNumberProvider";
import { eq, getTableColumns } from "drizzle-orm";
import { users as usersModel } from "@db/models/users";
import { documentLogs as documentLogsModel } from "@db/models/documentLog";
import { logMessageProvider } from "@utils/logMessageProvider";

type Variables = {
	userId: number; // from sessionAuth
};

const documentRouter = new Hono<{ Variables: Variables }>();

//#region document - POST
documentRouter.post(
	"/",
	sessionAuth("any"),
	zValidator("form", zDocuments),
	async (c) => {
		try {
			const authorId = c.get("userId");
			const form = c.req.valid("form");

			const { name, departmentId } = getTableColumns(usersModel);

			const userData = await db
				.select({ name, departmentId })
				.from(usersModel)
				.where(eq(usersModel.id, authorId))
				.limit(1);

			if (userData.length != 1) {
				c.status(404);
				return c.json({ message: "Author not found." });
			}

			const insertedDoc = await db
				.insert(documentsModel)
				.values({
					trackingNumber: await trackingNumberProvider(),
					status: "open",
					title: form.title,
					type: form.type,
					details: form.details,
					signatory: form.signatory,
					author: authorId,
				})
				.returning({
					id: documentsModel.id,
					trackingNumber: documentsModel.trackingNumber,
				});

			await db.insert(documentLogsModel).values({
				document: insertedDoc[0].id,
				location: userData[0].departmentId,
				author: authorId,
				action: "created",
				logMessage: logMessageProvider("created", userData[0].name),
			});

			c.status(201);
			return c.json({
				message: "Document successfully created!",
				insertedData: insertedDoc,
			});
		} catch (e) {
			if (!(e instanceof SQLiteError)) {
				console.error(e);
				c.status(500);
				return c.json({ message: "Internal Server Error" });
			}
		}
	}
);

export default documentRouter;

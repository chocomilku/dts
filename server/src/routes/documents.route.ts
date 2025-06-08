import { SQLiteError } from "bun:sqlite";
import { Hono } from "hono";
import { sessionAuth } from "@middlewares/sessionAuth";
import { zValidator } from "@hono/zod-validator";
import { documents as documentsModel, zDocuments } from "@db/models/documents";
import { db } from "@db/conn";
import { trackingNumberProvider } from "@utils/trackingNumberProvider";
import { eq, getTableColumns, desc } from "drizzle-orm";
import { users as usersModel } from "@db/models/users";
import {
	documentLogs as documentLogsModel,
	zDocumentLogs,
} from "@db/models/documentLog";
import { logMessageProvider } from "@utils/logMessageProvider";
import { z } from "zod";
import { emptyString } from "@utils/emptyString";
import { departments as departmentsModel } from "@db/models/departments";

type Variables = {
	userId: number; // from sessionAuth
};

const documentRouter = new Hono<{ Variables: Variables }>();

//#region GET document:id/logs
documentRouter.get("/:tn/logs", sessionAuth("any"), async (c) => {
	try {
		const { tn } = c.req.param();
		const { limit, offset } = c.req.query();

		const paramSchema = z.preprocess(emptyString, z.coerce.string());
		const parsedParam = paramSchema.safeParse(tn);
		if (!parsedParam.success) {
			c.status(400);
			return c.json(parsedParam.error);
		}

		const querySchema = z.object({
			limit: z.coerce.number().int().positive().optional().catch(undefined),
			offset: z.coerce.number().int().nonnegative().default(0).catch(0),
		});

		const parsedQuery = querySchema.safeParse({ limit, offset });
		if (!parsedQuery.success) {
			c.status(400);
			return c.json(parsedQuery.error);
		}

		const trackingNumber = parsedParam.data;

		const { id } = getTableColumns(documentsModel);

		const documentData = await db
			.select({ id })
			.from(documentsModel)
			.where(eq(documentsModel.trackingNumber, trackingNumber))
			.limit(1);

		if (documentData.length != 1) {
			c.status(404);
			return c.json({ message: "Document not found." });
		}

		const query = db
			.select()
			.from(documentLogsModel)
			.where(eq(documentLogsModel.document, documentData[0].id))
			.orderBy(desc(documentLogsModel.timestamp))
			.offset(parsedQuery.data.offset);

		if (parsedQuery.data.limit !== undefined) {
			query.limit(parsedQuery.data.limit);
		}

		const logsData = await query;
		c.status(200);
		return c.json({ message: "OK", data: logsData });
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

//#region POST document:id/action
documentRouter.post(
	"/:tn/action",
	sessionAuth("any"),
	zValidator("form", zDocumentLogs),
	async (c) => {
		try {
			const form = c.req.valid("form");
			const authorId = c.get("userId");
			const { tn } = c.req.param();

			const paramSchema = z.preprocess(emptyString, z.coerce.string());
			const parseData = paramSchema.safeParse(tn);
			if (!parseData.success) {
				c.status(400);
				return c.json(parseData.error);
			}

			const trackingNumber = parseData.data;

			// author
			const { name, departmentId } = getTableColumns(usersModel);
			const authorData = await db
				.select({ name, departmentId })
				.from(usersModel)
				.where(eq(usersModel.id, authorId))
				.limit(1);

			if (authorData.length != 1) {
				c.status(404);
				return c.json({ message: "Author not found." });
			}

			// recipient
			let recipient = null;
			if (form.recipient && form.recipientType) {
				switch (form.recipientType) {
					case "user":
						const recipientUserData = await db
							.select({ name })
							.from(usersModel)
							.where(eq(usersModel.id, form.recipient))
							.limit(1);

						if (recipientUserData.length != 1) {
							c.status(404);
							return c.json({ message: "Recipient not found." });
						}

						recipient = recipientUserData;
						break;
					case "dept":
						const { name: deptName } = getTableColumns(departmentsModel);
						const recipientDeptData = await db
							.select({ name: deptName })
							.from(departmentsModel)
							.where(eq(departmentsModel.id, form.recipient))
							.limit(1);

						if (recipientDeptData.length != 1) {
							c.status(404);
							return c.json({ message: "Recipient not found." });
						}

						recipient = recipientDeptData;
						break;

					default:
						recipient = null;
				}
			}

			// document
			const { id, signatory, assignedUser, assignedDepartment } =
				getTableColumns(documentsModel);
			const doc = await db
				.select({ id, signatory, assignedUser, assignedDepartment })
				.from(documentsModel)
				.where(eq(documentsModel.trackingNumber, trackingNumber))
				.limit(1);

			if (doc.length != 1) {
				c.status(404);
				return c.json({ message: "Document not found." });
			}

			// permission checks
			if (form.action == "approve" || form.action == "deny") {
				if (!(doc[0].signatory == authorId)) {
					c.status(403);
					return c.json({
						message: "You are not the signatory of this document.",
					});
				}
			}

			if (doc[0].assignedDepartment != null) {
				if (authorData[0].departmentId != doc[0].assignedDepartment) {
					c.status(403);
					return c.json({
						message: "This document does not belong to this department.",
					});
				}
			}

			if (doc[0].assignedUser != null) {
				if (authorId != doc[0].assignedUser) {
					c.status(403);
					return c.json({
						message: "This document is not assigned to you.",
					});
				}
			}

			// log action
			await db.insert(documentLogsModel).values({
				document: doc[0].id,
				location: authorData[0].departmentId,
				author: authorId,
				recipient: form.recipient,
				recipientType: form.recipientType,
				action: form.action,
				logMessage: logMessageProvider(
					form.action,
					authorData[0].name,
					recipient ? recipient[0].name : undefined
				),
				additionalDetails: form.additionalDetails,
			});
		} catch (e) {
			console.error(e);
			c.status(500);
			return c.json({ message: "Internal Server Error" });
		}
	}
);
//#endregion

//#region GET document:id
documentRouter.get("/:tn", sessionAuth("any"), async (c) => {
	try {
		const { tn } = c.req.param();
		const paramSchema = z.preprocess(emptyString, z.coerce.string());
		const parseData = paramSchema.safeParse(tn);
		if (!parseData.success) {
			c.status(400);
			return c.json(parseData.error);
		}

		const trackingNumber = parseData.data;

		const data = await db
			.select()
			.from(documentsModel)
			.where(eq(documentsModel.trackingNumber, trackingNumber))
			.limit(1);

		if (data.length != 1) {
			c.status(404);
			return c.json({ message: "Document not found." });
		}

		c.status(200);
		return c.json({ message: "OK", data });
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});

//#endregion

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

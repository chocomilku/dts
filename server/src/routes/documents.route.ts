import { SQLiteError } from "bun:sqlite";
import { Hono } from "hono";
import { sessionAuth } from "@middlewares/sessionAuth";
import { zValidator } from "@hono/zod-validator";
import {
	documents as documentsModel,
	zDocuments,
	zDocumentsStatus,
} from "@db/models/documents";
import { db } from "@db/conn";
import { trackingNumberProvider } from "@utils/trackingNumberProvider";
import { eq, getTableColumns, desc, sql, SQL, and, asc } from "drizzle-orm";
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

//#region documents/count
documentRouter.get("/count", sessionAuth("any"), async (c) => {
	try {
		const userId = c.get("userId");

		const { departmentId } = getTableColumns(usersModel);

		const user = await db
			.select({ departmentId })
			.from(usersModel)
			.limit(1)
			.where(eq(usersModel.id, userId));

		if (user.length != 1) {
			c.status(404);
			return c.json({ message: "User not found." });
		}

		const openCount = await db.$count(
			documentsModel,
			eq(documentsModel.status, "open")
		);
		const closedCount = await db.$count(
			documentsModel,
			eq(documentsModel.status, "closed")
		);
		const assignedCount = await db.$count(
			documentsModel,
			sql`${documentsModel.assignedUser} = ${userId} OR ${documentsModel.assignedDepartment} = ${user[0].departmentId}`
		);

		c.status(200);
		return c.json({
			message: "OK",
			data: {
				openCount,
				closedCount,
				assignedCount,
			},
		});
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

//#region documents - GET ALL
documentRouter.get("/", sessionAuth("any"), async (c) => {
	try {
		const userId = c.get("userId");
		const query = c.req.query();

		type SortFilters =
			| "created-asc"
			| "created-desc"
			| "updated-asc"
			| "updated-desc";

		const querySchema = z.object({
			limit: z.coerce.number().int().positive().max(50).default(10).catch(10),
			offset: z.coerce.number().int().nonnegative().default(0).catch(0),
			department: z.coerce.number().optional().catch(undefined),
			status: z.enum(["open", "closed"]).optional().catch(undefined),
			assigned: z.coerce.boolean().default(false).catch(false),
			sort: z
				.enum(["created-asc", "created-desc", "updated-asc", "updated-desc"])
				.default("updated-desc")
				.catch("updated-desc"),
		});
		const parsedQuery = querySchema.safeParse(query);

		if (!parsedQuery.success) {
			c.status(400);
			return c.json(parsedQuery.error);
		}

		const { departmentId } = getTableColumns(usersModel);

		const user = await db
			.select({ departmentId })
			.from(usersModel)
			.limit(1)
			.where(eq(usersModel.id, userId));

		if (user.length != 1) {
			c.status(404);
			return c.json({ message: "User not found." });
		}

		// documents query

		const filters: SQL[] = [];
		if (parsedQuery.data.department) {
			filters.push(
				eq(documentsModel.originDepartment, parsedQuery.data.department)
			);
		}

		if (parsedQuery.data.status) {
			filters.push(eq(documentsModel.status, parsedQuery.data.status));
		}

		if (parsedQuery.data.assigned) {
			filters.push(
				sql`${documentsModel.assignedUser} = ${userId} OR ${documentsModel.assignedDepartment} = ${user[0].departmentId}`
			);
		}

		const querySortFilter = (filter: SortFilters) => {
			switch (filter) {
				case "created-asc":
					return asc(documentsModel.createdAt);

				case "created-desc":
					return desc(documentsModel.createdAt);

				case "updated-asc":
					return asc(documentsModel.lastUpdatedAt);

				case "updated-desc":
					return desc(documentsModel.lastUpdatedAt);
				default:
					return desc(documentsModel.lastUpdatedAt);
			}
		};

		const data = await db
			.select()
			.from(documentsModel)
			.where(and(...filters))
			.limit(parsedQuery.data.limit)
			.offset(parsedQuery.data.offset)
			.orderBy(querySortFilter(parsedQuery.data.sort));

		c.status(200);
		return c.json({ message: "OK", data: data });
	} catch (e) {
		console.error(e);
		c.status(500);
		return c.json({ message: "Internal Server Error" });
	}
});
//#endregion

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
			const { id: userId, name, departmentId } = getTableColumns(usersModel);
			const authorData = await db
				.select({ name, departmentId })
				.from(usersModel)
				.where(eq(usersModel.id, authorId))
				.limit(1);

			if (authorData.length != 1) {
				c.status(404);
				return c.json({ message: "Author not found." });
			}

			type partialUser = {
				id: number;
				name: string;
				departmentId: number;
			};

			type partialDepartment = {
				id: number;
				name: string;
			};

			// recipient
			let recipient: null | partialUser | partialDepartment = null;

			if (form.recipient && form.recipientType) {
				if (form.recipientType === "user") {
					const recipientUserData = await db
						.select({ id: userId, name, departmentId })
						.from(usersModel)
						.where(eq(usersModel.id, form.recipient))
						.limit(1);

					if (recipientUserData.length != 1) {
						c.status(404);
						return c.json({ message: "Recipient not found." });
					}

					recipient = recipientUserData[0];
				} else if (form.recipientType === "dept") {
					const { id: deptId, name: deptName } =
						getTableColumns(departmentsModel);
					const recipientDeptData = await db
						.select({ id: deptId, name: deptName })
						.from(departmentsModel)
						.where(eq(departmentsModel.id, form.recipient))
						.limit(1);

					if (recipientDeptData.length != 1) {
						c.status(404);
						return c.json({ message: "Recipient not found." });
					}

					recipient = recipientDeptData[0];
				} else {
					recipient = null;
				}
			}

			// document
			const { id, signatory, assignedUser, assignedDepartment, status } =
				getTableColumns(documentsModel);
			const doc = await db
				.select({ id, signatory, assignedUser, assignedDepartment, status })
				.from(documentsModel)
				.where(eq(documentsModel.trackingNumber, trackingNumber))
				.limit(1);

			if (doc.length != 1) {
				c.status(404);
				return c.json({ message: "Document not found." });
			}

			if (doc[0].status == "closed") {
				c.status(409);
				return c.json({
					message: "Document is already closed and cannot be edited.",
				});
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

			if (form.action == "assign") {
				if (!recipient) {
					c.status(400);
					return c.json({
						message: "No recipient.",
					});
				}
				if ("departmentId" in recipient && recipient.departmentId) {
					if (recipient.departmentId != authorData[0].departmentId) {
						c.status(400);
						return c.json({
							message: "User to assign must be in the same department.",
						});
					}
				} else {
					c.status(400);
					return c.json({ message: "Invalid recipient type." });
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

			/**
			 * action assignment matrix
			 *
			 * created - author (docAuthor) [assignDept -> null, assignUser -> docAuthor]
			 * closed -  author (docAuthor) [assignDept -> null, assignUser -> null]
			 * reopen - author (author) [assignDept -> null, assignUser -> docAuthor]
			 * approve - author (assigned && signatory) [no update]
			 * deny - author (assigned && signatory) [no update]
			 * note - author (assigned) [no update]
			 * transfer - author (assigned), recipient (dept) [assignDept -> dept, assignUser -> null]
			 * recieve - author (any in department) [assignDept -> null, assignUser -> author]
			 * assign - author (recieved/assigned) [assignUser -> assigned]
			 */

			// for doc
			let assignUser: number | undefined | null = undefined;
			let assignDept: number | undefined | null = undefined;

			switch (form.action) {
				case "approve":
				case "deny":
				case "note":
					assignUser = undefined;
					assignDept = undefined;
					break;
				case "transfer":
					assignUser = null;
					if (!form.recipient) {
						c.status(400);
						return c.json({ message: "Recipient field is missing." });
					}
					assignDept = form.recipient;
					break;
				case "receive":
					assignUser = authorId;
					assignDept = null;
					break;
				case "assign":
					if (!form.recipient) {
						c.status(400);
						return c.json({ message: "Recipient field is missing." });
					}
					assignUser = form.recipient;
					assignDept = null;
					break;
				default:
					assignUser = undefined;
					assignDept = undefined;
			}

			const logMessage = logMessageProvider(
				form.action,
				authorData[0].name,
				recipient ? recipient.name : undefined
			);

			// log action
			await db.insert(documentLogsModel).values({
				document: doc[0].id,
				location: authorData[0].departmentId,
				author: authorId,
				recipient: form.recipient,
				recipientType: form.recipientType,
				action: form.action,
				logMessage: logMessage,
				additionalDetails: form.additionalDetails,
			});

			// assign
			await db
				.update(documentsModel)
				.set({
					lastUpdatedAt: sql`(CURRENT_TIMESTAMP)`,
					assignedDepartment: assignDept === undefined ? undefined : assignDept,
					assignedUser: assignDept === undefined ? undefined : assignUser,
				})
				.where(eq(documentsModel.id, doc[0].id));

			c.status(201);
			return c.json({
				message: "Document status updated!",
				data: { logMessage: logMessage },
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

//#region document:id - PATCH
documentRouter.patch(
	"/:tn",
	sessionAuth("any"),
	zValidator("form", zDocumentsStatus),
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
			const {
				id: userId,
				name,
				departmentId,
				role,
			} = getTableColumns(usersModel);
			const authorData = await db
				.select({ id: userId, name, departmentId, role })
				.from(usersModel)
				.where(eq(usersModel.id, authorId))
				.limit(1);

			if (authorData.length != 1) {
				c.status(404);
				return c.json({ message: "Author not found." });
			}

			// doc
			const {
				id: docId,
				signatory,
				status,
				author,
			} = getTableColumns(documentsModel);
			const doc = await db
				.select({ id: docId, signatory, status, author })
				.from(documentsModel)
				.where(eq(documentsModel.trackingNumber, trackingNumber))
				.limit(1);

			if (doc.length != 1) {
				c.status(404);
				return c.json({ message: "Document not found." });
			}

			// close: signatory, superadmin, docAuthor
			// open: superadmin, docAuthor

			if (
				(form.status == "open" && doc[0].status == "open") ||
				(form.status == "closed" && doc[0].status == "closed")
			) {
				c.status(204);
				return c.json({});
			}

			const isSignatory = authorId == doc[0].signatory;
			const isDocAuthor = doc[0].author == authorId;
			const isSuperAdmin = authorData[0].role == "superadmin";

			if (form.status == "closed") {
				if (!isSignatory && !isDocAuthor && !isSuperAdmin) {
					c.status(403);
					return c.json({ message: "Insufficient permissions" });
				}
			}

			if (form.status == "open") {
				if (!isDocAuthor && !isSuperAdmin) {
					c.status(403);
					return c.json({ message: "Insufficient permissions" });
				}
			}

			await db.insert(documentLogsModel).values({
				document: doc[0].id,
				location: authorData[0].departmentId,
				author: authorId,
				action: form.status == "closed" ? "closed" : "reopen",
				logMessage: logMessageProvider(
					form.status == "closed" ? "closed" : "reopen",
					authorData[0].name
				),
				additionalDetails: form.additionalDetails,
			});

			await db
				.update(documentsModel)
				.set({
					lastUpdatedAt: sql`(CURRENT_TIMESTAMP)`,
					assignedDepartment: null,
					assignedUser: null,
					status: form.status,
				})
				.where(eq(documentsModel.id, doc[0].id));

			c.status(204);
			return c.json({});
		} catch (e) {
			console.error(e);
			c.status(500);
			return c.json({ message: "Internal Server Error" });
		}
	}
);
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
					originDepartment: userData[0].departmentId,
					assignedUser: authorId,
					assignedDepartment: null,
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

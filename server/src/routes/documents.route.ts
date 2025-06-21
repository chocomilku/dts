import { SQLiteError } from "bun:sqlite";
import { Hono } from "hono";
import { sessionAuth, SessionAuthVariables } from "@middlewares/sessionAuth";
import { zValidator } from "@hono/zod-validator";
import {
	documents as documentsModel,
	zDocuments,
	zDocumentsStatus,
} from "@db/models/documents";
import { db } from "@db/conn";
import { trackingNumberProvider } from "@utils/trackingNumberProvider";
import {
	eq,
	getTableColumns,
	desc,
	sql,
	SQL,
	and,
	asc,
	or,
	like,
	exists,
	count,
	ne,
} from "drizzle-orm";
import { User, users as usersModel } from "@db/models/users";
import {
	documentLogs as documentLogsModel,
	zDocumentLogs,
} from "@db/models/documentLog";
import { logMessageProvider } from "@utils/logMessageProvider";
import { z } from "zod/v4";
import { emptyString } from "@utils/emptyString";
import {
	Department,
	departments as departmentsModel,
} from "@db/models/departments";

type Variables = {} & SessionAuthVariables;

const documentRouter = new Hono<{ Variables: Variables }>();

//#region documents/count
documentRouter.get("/count", sessionAuth("any"), async (c) => {
	try {
		const user = c.get("user");

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
			or(
				eq(documentsModel.assignedUser, user.id),
				eq(documentsModel.assignedDepartment, user.departmentId)
			)
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
const getAllDocumentsQuerySchema = z.object({
	limit: z.coerce.number().int().positive().max(100).default(10).catch(10),
	offset: z.coerce.number().int().nonnegative().default(0).catch(0),
	department: z.coerce.number().optional().catch(undefined),
	status: z.enum(["open", "closed"]).optional().catch(undefined),
	assigned: z.stringbool().optional().catch(undefined),
	q: z.string().optional().catch(undefined),
	sort: z
		.enum(["created-asc", "created-desc", "updated-asc", "updated-desc"])
		.default("updated-desc")
		.catch("updated-desc"),
});

documentRouter.get(
	"/",
	sessionAuth("any"),
	zValidator("query", getAllDocumentsQuerySchema),
	async (c) => {
		try {
			const user = c.get("user");
			const parsedQuery = c.req.valid("query");

			// documents query

			const filters: SQL[] = [];
			if (parsedQuery.department) {
				filters.push(
					eq(documentsModel.originDepartment, parsedQuery.department)
				);
			}

			if (parsedQuery.status) {
				filters.push(eq(documentsModel.status, parsedQuery.status));
			}

			if (parsedQuery.assigned != undefined) {
				let assignedFilter;

				if (parsedQuery.assigned == true) {
					assignedFilter = or(
						eq(documentsModel.assignedUser, user.id),
						eq(documentsModel.assignedDepartment, user.departmentId)
					);
				} else {
					assignedFilter = or(
						ne(documentsModel.assignedUser, user.id),
						ne(documentsModel.assignedDepartment, user.departmentId)
					);
				}

				if (assignedFilter) {
					filters.push(assignedFilter);
				}
			}

			const orderByClauses = [];

			if (parsedQuery.q) {
				const searchTerm = `%${parsedQuery.q}%`;
				const searchFilter = or(
					like(documentsModel.title, searchTerm),
					like(documentsModel.trackingNumber, searchTerm),
					like(documentsModel.type, searchTerm),
					exists(
						db
							.select({ val: sql`1` })
							.from(usersModel)
							.where(
								and(
									eq(usersModel.id, documentsModel.author), // Correlate with the document's author
									like(usersModel.name, searchTerm)
								)
							)
					),
					exists(
						db
							.select({ val: sql`1` })
							.from(usersModel)
							.where(
								and(
									eq(usersModel.id, documentsModel.signatory), // Correlate with the document's signatory
									like(usersModel.name, searchTerm)
								)
							)
					),
					sql`(${documentsModel.assignedUser} IS NOT NULL AND EXISTS (
                        SELECT 1 FROM ${usersModel} users_assigned
                        WHERE users_assigned.id = ${documentsModel.assignedUser}
                        AND users_assigned.name LIKE ${searchTerm}
                    ))`,
					sql`(${documentsModel.assignedDepartment} IS NOT NULL AND EXISTS (
                        SELECT 1 FROM ${departmentsModel} depts_assigned
                        WHERE depts_assigned.id = ${documentsModel.assignedDepartment}
                        AND depts_assigned.name LIKE ${searchTerm}
                    ))`
				);

				if (searchFilter) filters.push(searchFilter);

				// Define the priority CASE statement for ORDER BY
				// (title -> tracking number) -> author -> signatory -> assigned user -> assigned department -> (default) sort filters
				const priorityCaseStatement = sql`
                    CASE
                        WHEN (${documentsModel.title} LIKE ${searchTerm} OR ${documentsModel.trackingNumber} LIKE ${searchTerm}) THEN 1
                        WHEN EXISTS (SELECT 1 FROM ${usersModel} u_auth WHERE u_auth.id = ${documentsModel.author} AND u_auth.name LIKE ${searchTerm}) THEN 2
                        WHEN EXISTS (SELECT 1 FROM ${usersModel} u_sig WHERE u_sig.id = ${documentsModel.signatory} AND u_sig.name LIKE ${searchTerm}) THEN 3
                        WHEN (${documentsModel.assignedUser} IS NOT NULL AND EXISTS (SELECT 1 FROM ${usersModel} u_as_usr WHERE u_as_usr.id = ${documentsModel.assignedUser} AND u_as_usr.name LIKE ${searchTerm})) THEN 4
                        WHEN (${documentsModel.assignedDepartment} IS NOT NULL AND EXISTS (SELECT 1 FROM ${departmentsModel} d_as_dpt WHERE d_as_dpt.id = ${documentsModel.assignedDepartment} AND d_as_dpt.name LIKE ${searchTerm})) THEN 5
                        ELSE 6
                    END
                `;
				orderByClauses.push(priorityCaseStatement); // Primary sort by hit type priority
			}

			let secondaryOrderByClause;

			switch (parsedQuery.sort) {
				case "created-asc":
					secondaryOrderByClause = asc(documentsModel.createdAt);
					break;
				case "created-desc":
					secondaryOrderByClause = desc(documentsModel.createdAt);
					break;
				case "updated-asc":
					secondaryOrderByClause = asc(documentsModel.lastUpdatedAt);
					break;
				case "updated-desc":
				default:
					secondaryOrderByClause = desc(documentsModel.lastUpdatedAt);
					break;
			}
			orderByClauses.push(secondaryOrderByClause);

			const filterCondition = filters.length > 0 ? and(...filters) : undefined;

			const totalCountResult = await db
				.select({ value: count() })
				.from(documentsModel)
				.where(filterCondition);
			const totalCount = totalCountResult[0]?.value || 0;

			const sqlQuery = db
				.select()
				.from(documentsModel)
				.where(filterCondition)
				.limit(parsedQuery.limit)
				.offset(parsedQuery.offset)
				.orderBy(...orderByClauses);

			// console.log(sqlQuery.toSQL());

			const data = await sqlQuery;

			c.status(200);
			return c.json({
				message: "OK",
				data: data,
				pagination: {
					total: totalCount,
					limit: parsedQuery.limit,
					offset: parsedQuery.offset,
					pageCount: Math.ceil(totalCount / parsedQuery.limit),
					currentPage: Math.floor(parsedQuery.offset / parsedQuery.limit) + 1,
				},
			});
		} catch (e) {
			console.error(e);
			c.status(500);
			return c.json({ message: "Internal Server Error" });
		}
	}
);
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
			const author = c.get("user");
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

			type PartialUser = Pick<User, "id" | "name" | "departmentId">;

			type PartialDepartment = Pick<Department, "id" | "name">;

			// recipient
			let recipient: null | PartialUser | PartialDepartment = null;

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
				if (!(doc[0].signatory == author.id)) {
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
					if (recipient.departmentId != author.departmentId) {
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
				if (author.departmentId != doc[0].assignedDepartment) {
					c.status(403);
					return c.json({
						message: "This document does not belong to this department.",
					});
				}
			}

			if (doc[0].assignedUser != null) {
				if (author.id != doc[0].assignedUser) {
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
					assignUser = author.id;
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
				author.name,
				recipient ? recipient.name : undefined
			);

			// log action
			await db.insert(documentLogsModel).values({
				document: doc[0].id,
				location: author.departmentId,
				author: author.id,
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
			const author = c.get("user");
			const { tn } = c.req.param();

			const paramSchema = z.preprocess(emptyString, z.coerce.string());
			const parseData = paramSchema.safeParse(tn);
			if (!parseData.success) {
				c.status(400);
				return c.json(parseData.error);
			}

			const trackingNumber = parseData.data;

			// doc
			const {
				id: docId,
				signatory,
				status,
				author: docAuthor,
			} = getTableColumns(documentsModel);
			const doc = await db
				.select({ id: docId, signatory, status, author: docAuthor })
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

			const isSignatory = author.id == doc[0].signatory;
			const isDocAuthor = doc[0].author == author.id;
			const isSuperAdmin = author.role == "superadmin";

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
				location: author.departmentId,
				author: author.id,
				action: form.status == "closed" ? "closed" : "reopen",
				logMessage: logMessageProvider(
					form.status == "closed" ? "closed" : "reopen",
					author.name
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
			const author = c.get("user");
			const form = c.req.valid("form");

			const insertedDoc = await db
				.insert(documentsModel)
				.values({
					trackingNumber: await trackingNumberProvider(),
					status: "open",
					title: form.title,
					type: form.type,
					details: form.details,
					signatory: form.signatory,
					author: author.id,
					originDepartment: author.departmentId,
					assignedUser: author.id,
					assignedDepartment: null,
				})
				.returning({
					id: documentsModel.id,
					trackingNumber: documentsModel.trackingNumber,
				});

			await db.insert(documentLogsModel).values({
				document: insertedDoc[0].id,
				location: author.departmentId,
				author: author.id,
				action: "created",
				logMessage: logMessageProvider("created", author.name),
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

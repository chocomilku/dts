type ActionTypes =
	| "created"
	| "closed"
	| "reopen"
	| "note"
	| "transfer"
	| "recieve"
	| "assign"
	| "approve"
	| "deny";

export const logMessageProvider = (
	action: ActionTypes,
	author?: string,
	recipient?: string
) => {
	switch (action) {
		case "created":
			return `Document has been created by ${author}.`;
		case "transfer":
			return `Document has been transferred to ${recipient}.`;
		case "recieve":
			return `Document has been received by ${author}.`;
		case "assign":
			return `Document has been assigned to ${recipient}.`;
		case "note":
			return `${author} has attached a note.`;
		case "closed":
			return `Document has been closed.`;
		case "approve":
			return `Document has been approved by ${author}.`;
		case "deny":
			return `Document has been denied by ${author}.`;
		case "reopen":
			return `Document has been reopened by ${author}`;
	}
};

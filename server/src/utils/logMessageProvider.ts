type ActionTypes =
	| "created"
	| "closed"
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
			return `Document has been created by ${author ?? "Unknown"}.`;
		case "transfer":
			return `Document has been transferred to ${recipient ?? "Unknown"}.`;
		case "recieve":
			return `Document has been received by ${author ?? "Unknown"}.`;
		case "assign":
			return `Document has been assigned to ${recipient ?? "Unknown"}.`;
		case "note":
			return `${author ?? "Unknown"} has attached a note.`;
		case "closed":
			return `Document has been closed.`;
		case "approve":
			return `Document has been approved by ${author}.`;
		case "deny":
			return `Document has been denied by ${author}.`;
	}
};

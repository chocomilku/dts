import { sqliteProvider } from "@db/conn";

export const trackingNumberProvider = async () => {
	// DOC2025-00001
	// DOC - Year - Sequence ID

	const query = sqliteProvider.prepare(
		"SELECT seq from sqlite_sequence WHERE name = 'documents';"
	);
	const res = query.get() as { seq: number };

	const PREFIX = "DOC";
	const year = new Date().getFullYear().toString();
	const sequenceId = ((res.seq ?? 0) + 1).toString().padStart(5, "0");

	return `${PREFIX}${year}-${sequenceId}`;
};

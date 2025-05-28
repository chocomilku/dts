import { sqliteProvider } from "@db/conn";

export const usernameProvider = async () => {
	// MNL25-0001
	// Area Code - Year - Sequence ID

	const query = sqliteProvider.prepare(
		"SELECT seq from sqlite_sequence WHERE name = 'users';"
	);
	const res = query.get() as { seq: number };

	const AREA_CODE = "MNL";
	const year = new Date().getFullYear().toString().slice(-2);
	const sequenceId = (res.seq + 1).toString().padStart(4, "0");

	return `${AREA_CODE}${year}-${sequenceId}`;
};

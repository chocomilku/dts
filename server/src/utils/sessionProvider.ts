import { redis } from "@db/redis";

const SESSION_TTL = 60 * 60 * 24; // 1 day in seconds

const createSession = async (userId: number) => {
	const sessionId = crypto.randomUUID();
	const key = `session:${sessionId}`;

	await redis.set(key, userId.toString());
	await redis.expire(key, SESSION_TTL);

	return sessionId;
};

const getSession = async (sessionId: string) => {
	const userId = await redis.get(`session:${sessionId}`);
	return userId ? Number(userId) : null;
};

const destroySession = async (sessionId: string) => {
	await redis.del(`session:${sessionId}`);
};

export { createSession, getSession, destroySession };

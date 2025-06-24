import { redis } from "@db/redis";

const token_TTL = 60 * 15; // 15 mins in seconds

const createToken = async (userId: number) => {
	const tokenId = crypto.randomUUID();
	const key = `resetToken:${tokenId}`;

	await redis.set(key, userId.toString());
	await redis.expire(key, token_TTL);

	return tokenId;
};

const getToken = async (tokenId: string) => {
	const userId = await redis.get(`resetToken:${tokenId}`);
	return userId ? Number(userId) : null;
};

const destroyToken = async (tokenId: string) => {
	await redis.del(`resetToken:${tokenId}`);
};

export { createToken, getToken, destroyToken };

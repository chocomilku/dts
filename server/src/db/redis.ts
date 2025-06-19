import { RedisClient } from "bun";

const redis = new RedisClient(
	process.env.REDIS_CONN ?? "redis://localhost:6379"
);

export { redis };

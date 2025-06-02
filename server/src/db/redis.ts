import { RedisClient } from "bun";

// TODO: change url info after dockerizing entire app
// use env passed from docker
const redis = new RedisClient("redis://redis:6379");

export { redis };

import { Hono } from "hono";
import { usersController } from "@/controllers/users/users.controller";

const users = new Hono();

users.get("/", usersController);

export default users;

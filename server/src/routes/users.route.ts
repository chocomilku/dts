import { Hono } from "hono";
import userController from "@controllers/users";

const users = new Hono();

users.get("/", userController.getUsersController);

export default users;

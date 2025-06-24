# Document Tracking System

A fullstack web application inspired by the University's Internal Document Tracking System and JIRA, an issue tracking software. \
**FINAL Project for COMP 016 WEB DEVELOPMENT**

## Technologies Used

### Front-end

- HTML
- JavaScript
- Bootstrap (CSS Framework)
- select2 (JQuery library)
- summernote (JQuery library)
- Caddy (Reverse-proxy, Routing, and Static File Server)

### Back-end

- TypeScript
- Bun (JS Runtime)
- Hono (API Library)
- Drizzle ORM
- SQLite (Main Database)
- Redis (Session Auth Database)
- Nodemailer (SMTP Transporter)

### Development Environment

- Docker
- VSCode
- Dev Containers
- Live Server VSCode and Browser Extension
- Ethereal.email (Fake SMTP service for testing/dev)

### Production Environment

- Docker
- Cloudflare Tunnels

## Usage

- Spin up the containers with `docker compose`: \
  add `-d` if you want to run it in the background

```
docker compose --profile dev up
```

This will pull `redis`, `caddy`, and `oven/bun` from the Docker Registry. It will also build the server image.

The `Dockerfile.dev` file inside the server folder will only use the `oven/bun` image to use the workdir `/app`. You have to mount it eventually in the `docker-compose.yml`

The SQLite Database is in the `/database` folder and should have a `db.sqlite` file in it. You have to mount this in `docker-compose.yml` if you want to access it outside the container.

- Removing the containers with `docker compose`:

```
docker compose --profile dev down
```

> **Note**: `--profile <dev | prod>` is important here because without it, only `redis` will be initialized/removed.

## License

This project is licensed under MIT License.

## Todo

- **responsive login page**

- ~~**collapisble users**~~ \
  ~~show id role username (visible to admins only [intercept API level])~~ \

- ~~**department pages**~~ \
  ~~add description (hmmm)~~ \
  ~~list members~~

- ~~**document aging (default to 2 weeks from creation)**~~ \
  `dueAt: timestamp`

- ~~**overdue filter**~~ \
  ~~overdue if `dueAt > createdAt`~~

- ~~**overdue badge**~~

- ~~new document page toggle no due date~~

- ~~dashboard overdue count~~

- ~~documents overdue filter~~

- ~~server side due date check~~

- ~~department / staff pages show no results~~

- ~~remove avatar~~

- deprecate staff members -> redirect to departments instead

- move add staff logic to departments

- add staff email

- flatten zod errors -> move to message property

- ~~**forgot password**~~ \
  ~~nodemailer~~ ~~forgot password~~ -> ~~put email~~ -> ~~link to reset password (TTL 10min, redis)~~

- **notif system** \
  websocket \
  email notifs

- **multiple signatories** \
  breaking change: remove signatory from document \
  new signatories table

```
document: documentId
signatory: userId
lastUpdatedAt: timestamp
status: null | "approved" | "denied" | "amend"
```

- **feedback form**

```
author: authorId
timestamp: timestamp
feedback: string
```

- **feedback list (superadmin)**

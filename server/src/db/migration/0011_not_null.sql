PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_departments`("id", "name", "createdAt") SELECT "id", "name", "createdAt" FROM `departments`;--> statement-breakpoint
DROP TABLE `departments`;--> statement-breakpoint
ALTER TABLE `__new_departments` RENAME TO `departments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE TABLE `__new_documentLogs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document` integer NOT NULL,
	`location` integer NOT NULL,
	`author` integer NOT NULL,
	`recipient` integer,
	`recipientType` text,
	`action` text NOT NULL,
	`logMessage` text NOT NULL,
	`additionalDetails` text,
	`timestamp` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`document`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_documentLogs`("id", "document", "location", "author", "recipient", "recipientType", "action", "logMessage", "additionalDetails", "timestamp") SELECT "id", "document", "location", "author", "recipient", "recipientType", "action", "logMessage", "additionalDetails", "timestamp" FROM `documentLogs`;--> statement-breakpoint
DROP TABLE `documentLogs`;--> statement-breakpoint
ALTER TABLE `__new_documentLogs` RENAME TO `documentLogs`;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trackingNumber` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`details` text NOT NULL,
	`signatory` integer NOT NULL,
	`author` integer NOT NULL,
	`originDepartment` integer NOT NULL,
	`assignedUser` integer,
	`assignedDepartment` integer,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`lastUpdatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`signatory`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`originDepartment`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignedUser`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignedDepartment`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "trackingNumber", "status", "title", "type", "details", "signatory", "author", "originDepartment", "assignedUser", "assignedDepartment", "createdAt", "lastUpdatedAt") SELECT "id", "trackingNumber", "status", "title", "type", "details", "signatory", "author", "originDepartment", "assignedUser", "assignedDepartment", "createdAt", "lastUpdatedAt" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
CREATE UNIQUE INDEX `documents_trackingNumber_unique` ON `documents` (`trackingNumber`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`departmentId` integer NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "role", "name", "departmentId", "username", "password", "createdAt") SELECT "id", "role", "name", "departmentId", "username", "password", "createdAt" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
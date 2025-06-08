CREATE TABLE `documentLogs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document` integer NOT NULL,
	`location` integer NOT NULL,
	`author` integer NOT NULL,
	`recipient` integer,
	`recipientType` text,
	`action` text NOT NULL,
	`details` text,
	`timestamp` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`document`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trackingNumber` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`signatory` integer,
	`author` integer,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`lastUpdatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`signatory`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_trackingNumber_unique` ON `documents` (`trackingNumber`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`departmentId` integer NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "role", "name", "departmentId", "username", "password", "createdAt") SELECT "id", "role", "name", "departmentId", "username", "password", "createdAt" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
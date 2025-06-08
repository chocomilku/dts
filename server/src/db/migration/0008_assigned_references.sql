PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trackingNumber` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`details` text NOT NULL,
	`signatory` integer NOT NULL,
	`author` integer NOT NULL,
	`assignedUser` integer,
	`assignedDepartment` integer,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`lastUpdatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`signatory`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignedUser`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignedDepartment`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "trackingNumber", "status", "title", "type", "details", "signatory", "author", "assignedUser", "assignedDepartment", "createdAt", "lastUpdatedAt") SELECT "id", "trackingNumber", "status", "title", "type", "details", "signatory", "author", "assignedUser", "assignedDepartment", "createdAt", "lastUpdatedAt" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `documents_trackingNumber_unique` ON `documents` (`trackingNumber`);
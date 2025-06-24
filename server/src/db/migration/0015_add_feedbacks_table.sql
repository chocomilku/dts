CREATE TABLE `feedbacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author` integer,
	`timestamp` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`feedback` text NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

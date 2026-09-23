CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'Dilamar' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`work_mode` text DEFAULT 'Remote' NOT NULL,
	`job_url` text DEFAULT '' NOT NULL,
	`salary` text DEFAULT '' NOT NULL,
	`applied_date` text DEFAULT '' NOT NULL,
	`next_step_date` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_applications_status` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_applications_next_step_date` ON `applications` (`next_step_date`);--> statement-breakpoint
PRAGMA optimize;

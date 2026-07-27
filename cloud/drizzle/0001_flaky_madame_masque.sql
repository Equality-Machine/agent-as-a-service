ALTER TABLE `jobs` ADD `stage` text DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `heartbeat_at` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `lease_expires_at` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `cancel_requested_at` text;
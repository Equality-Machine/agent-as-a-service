CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`provider` text NOT NULL,
	`execution_mode` text DEFAULT 'local' NOT NULL,
	`runner_id` text NOT NULL,
	`source_handle` text NOT NULL,
	`source_digest` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`agent_version_id` text NOT NULL,
	`runtime_session_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`runner_id` text NOT NULL,
	`input` text NOT NULL,
	`output` text,
	`error` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`lease_token` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`claimed_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runners` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`kind` text DEFAULT 'local' NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'online' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

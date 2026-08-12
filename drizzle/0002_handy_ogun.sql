CREATE TABLE `competitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`eventId` int,
	`status` enum('active','ended','draft') NOT NULL DEFAULT 'active',
	`startDate` timestamp,
	`endDate` timestamp,
	`qualificationRules` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerUserId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`eventId` int,
	`referralCode` varchar(32) NOT NULL,
	`status` enum('pending','qualified','rejected','duplicate') NOT NULL DEFAULT 'qualified',
	`qualificationReason` varchar(255) NOT NULL DEFAULT 'Valid registration via referral link',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_records_referredUserId_unique` UNIQUE(`referredUserId`)
);
--> statement-breakpoint
ALTER TABLE `training_events` ADD `replayMode` enum('free','paid','restricted','unavailable') DEFAULT 'free' NOT NULL;
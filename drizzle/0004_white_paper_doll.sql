CREATE TABLE `payment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`amountKobo` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`status` enum('initialized','paid','failed') NOT NULL DEFAULT 'initialized',
	`authorizationUrl` text,
	`providerTransactionId` varchar(128),
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_transactions_reference_unique` UNIQUE(`reference`)
);

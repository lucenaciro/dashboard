CREATE TABLE `logs_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` varchar(100) NOT NULL,
	`status` enum('iniciado','parsing','enviando','processando','concluido','erro') NOT NULL,
	`totalArquivos` int,
	`arquivosProcessados` int DEFAULT 0,
	`totalRegistros` int,
	`registrosProcessados` int DEFAULT 0,
	`erros` text,
	`checkpoint` varchar(50),
	`timestampInicio` timestamp DEFAULT (now()),
	`timestampFim` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `logs_uploads_id` PRIMARY KEY(`id`),
	CONSTRAINT `logs_uploads_uploadId_unique` UNIQUE(`uploadId`)
);

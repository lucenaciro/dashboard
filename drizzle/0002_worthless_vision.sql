CREATE TABLE `uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`tipoArquivo` enum('clientes','vendedores','produtos','movimentacoes','estoque') NOT NULL,
	`tamanhoBytes` int NOT NULL,
	`status` enum('processando','concluido','erro') NOT NULL DEFAULT 'processando',
	`registrosProcessados` int DEFAULT 0,
	`registrosComErro` int DEFAULT 0,
	`mensagemErro` text,
	`dataUpload` timestamp NOT NULL DEFAULT (now()),
	`dataProcessamento` timestamp,
	`usuarioId` int,
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `uploads` ADD CONSTRAINT `uploads_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
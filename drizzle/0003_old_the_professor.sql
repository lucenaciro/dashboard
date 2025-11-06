CREATE TABLE `ciclos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`dataInicio` timestamp NOT NULL DEFAULT (now()),
	`dataFim` timestamp,
	`status` enum('ativo','concluido','arquivado') NOT NULL DEFAULT 'ativo',
	`totalClientes` int DEFAULT 0,
	`totalVendedores` int DEFAULT 0,
	`totalProdutos` int DEFAULT 0,
	`totalMovimentacoes` int DEFAULT 0,
	`totalEstoque` int DEFAULT 0,
	`usuarioId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ciclos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ciclos` ADD CONSTRAINT `ciclos_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
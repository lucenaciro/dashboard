CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigoCliente` varchar(50) NOT NULL,
	`cnpj` varchar(50),
	`nome` text NOT NULL,
	`endereco` text,
	`bairro` varchar(255),
	`municipio` varchar(255),
	`estado` varchar(2),
	`cep` varchar(20),
	`email` text,
	`telefone` varchar(50),
	`inscricaoEstadual` varchar(50),
	`tipoCliente` enum('loja_propria','revendedor','consumidor_final') DEFAULT 'consumidor_final',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`),
	CONSTRAINT `clientes_codigoCliente_unique` UNIQUE(`codigoCliente`)
);
--> statement-breakpoint
CREATE TABLE `estoque` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distribuidor` text,
	`codigoProduto` varchar(50) NOT NULL,
	`quantidade` int NOT NULL,
	`dataEstoque` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `estoque_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `movimentacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distribuidor` text,
	`cnpjDistribuidor` varchar(50),
	`codigoVendedor` varchar(50),
	`nomeVendedor` text,
	`codigoCliente` varchar(50) NOT NULL,
	`nomeCliente` text,
	`codigoProduto` varchar(50) NOT NULL,
	`nomeProduto` text,
	`quantidade` int NOT NULL,
	`valorTotal` int NOT NULL,
	`data` date NOT NULL,
	`numeroNota` varchar(50),
	`tipoSaida` varchar(50),
	`descricaoSaida` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movimentacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigoProduto` varchar(50) NOT NULL,
	`descricao` text NOT NULL,
	`doh` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`),
	CONSTRAINT `produtos_codigoProduto_unique` UNIQUE(`codigoProduto`)
);
--> statement-breakpoint
CREATE TABLE `sellOut` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cnpjMatriz` varchar(50),
	`cnpjEmissorNF` varchar(50),
	`codigoCliente` varchar(50),
	`razaoSocialCliente` text,
	`cnpjCliente` varchar(50),
	`enderecoCliente` text,
	`bairroCliente` varchar(255),
	`cidadeCliente` varchar(255),
	`ufCliente` varchar(2),
	`cepCliente` varchar(20),
	`tipoCliente` varchar(100),
	`numeroNotaFiscal` varchar(50),
	`dataVenda` date,
	`codigoSKU` varchar(50),
	`volume` int,
	`valorTotal` int,
	`codigoVendedorDistribuidor` varchar(50),
	`nomeVendedor` text,
	`tabelaPrecos` varchar(100),
	`vendaComQRCode` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sellOut_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigoVendedor` varchar(50) NOT NULL,
	`nome` text NOT NULL,
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendedores_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendedores_codigoVendedor_unique` UNIQUE(`codigoVendedor`)
);

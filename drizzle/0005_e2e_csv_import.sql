ALTER TABLE `movimentacoes`
  ADD COLUMN `tabelaPrecos` varchar(100),
  ADD COLUMN `vendaComQRCode` tinyint(1),
  ADD COLUMN `fingerprint` varchar(64);

UPDATE `movimentacoes`
SET `fingerprint` = SHA2(CONCAT(
  IFNULL(`codigoCliente`, ''), '|',
  IFNULL(`codigoProduto`, ''), '|',
  IFNULL(`data`, ''), '|',
  IFNULL(`numeroNota`, ''), '|',
  IFNULL(`quantidade`, ''), '|',
  IFNULL(`valorTotal`, '')
), 256)
WHERE `fingerprint` IS NULL;

ALTER TABLE `movimentacoes`
  MODIFY COLUMN `fingerprint` varchar(64) NOT NULL,
  ADD CONSTRAINT `movimentacoes_fingerprint_unique` UNIQUE (`fingerprint`);

ALTER TABLE `estoque`
  ADD COLUMN `fingerprint` varchar(64);

UPDATE `estoque`
SET `fingerprint` = SHA2(CONCAT(
  IFNULL(`codigoProduto`, ''), '|',
  IFNULL(`dataEstoque`, ''), '|',
  IFNULL(`quantidade`, ''), '|',
  IFNULL(`distribuidor`, '')
), 256)
WHERE `fingerprint` IS NULL;

ALTER TABLE `estoque`
  MODIFY COLUMN `fingerprint` varchar(64) NOT NULL,
  ADD CONSTRAINT `estoque_fingerprint_unique` UNIQUE (`fingerprint`);

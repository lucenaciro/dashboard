/**
 * Sistema de validação de dados para importação
 * Verifica campos obrigatórios, detecta campos vazios e valida formatos
 */

export interface ValidationError {
  linha: number;
  campo: string;
  valor: any;
  erro: string;
}



export interface ValidationResult {
  valido: boolean;
  erros: ValidationError[];
  avisos: string[];
  linhasValidas: number;
  linhasInvalidas: number;
  camposVazios: Record<string, number>;
}

// Validadores específicos por tipo de campo
export const validadores = {
  cnpj: (valor: string): boolean => {
    if (!valor) return true; // CNPJ é opcional
    const cleaned = valor.replace(/[^\d]/g, '');
    return cleaned.length === 14;
  },

  data: (valor: string): boolean => {
    if (!valor) return false;
    // Aceita DD/MM/YYYY, YYYY-MM-DD ou timestamp Excel
    const patterns = [
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d+$/,
    ];
    return patterns.some(pattern => pattern.test(valor));
  },

  numero: (valor: string | number): boolean => {
    if (valor === '' || valor === null || valor === undefined) return false;
    const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
    return !isNaN(num) && isFinite(num);
  },

  texto: (valor: string): boolean => {
    return typeof valor === 'string' && valor.trim().length > 0;
  },

  email: (valor: string): boolean => {
    if (!valor) return true; // Email é opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(valor);
  },
};

// Schemas de validação por tipo de arquivo
export const schemas = {
  clientes: {
    CODIGO: { obrigatorio: true, tipo: 'texto' as const },
    NOME: { obrigatorio: true, tipo: 'texto' as const },
    CNPJ: { obrigatorio: false, tipo: 'cnpj' as const },
    CIDADE: { obrigatorio: false, tipo: 'texto' as const },
    ESTADO: { obrigatorio: false, tipo: 'texto' as const },
    TIPO: { obrigatorio: false, tipo: 'texto' as const },
  },
  vendedores: {
    CODIGO: { obrigatorio: true, tipo: 'texto' as const },
    NOME: { obrigatorio: true, tipo: 'texto' as const },
  },
  produtos: {
    CODIGO: { obrigatorio: true, tipo: 'texto' as const },
    DESCRICAO: { obrigatorio: true, tipo: 'texto' as const },
  },
  movimentacoes: {
    CODIGO_CLIENTE: { obrigatorio: true, tipo: 'texto' as const },
    CODIGO_VENDEDOR: { obrigatorio: false, tipo: 'texto' as const },
    CODIGO_PRODUTO: { obrigatorio: true, tipo: 'texto' as const },
    DATA_PEDIDO: { obrigatorio: true, tipo: 'data' as const },
    QUANTIDADE: { obrigatorio: true, tipo: 'numero' as const },
    VALOR_TOTAL: { obrigatorio: true, tipo: 'numero' as const },
  },
  estoque: {
    CODIGO_PRODUTO: { obrigatorio: true, tipo: 'texto' as const },
    QUANTIDADE: { obrigatorio: true, tipo: 'numero' as const },
    DATA_ESTOQUE: { obrigatorio: true, tipo: 'data' as const },
    DISTRIBUIDOR: { obrigatorio: false, tipo: 'texto' as const },
  },
};

export function validarDados(
  dados: Record<string, any>[],
  tipoArquivo: keyof typeof schemas
): ValidationResult {
  const schema = schemas[tipoArquivo];
  const erros: ValidationError[] = [];
  const avisos: string[] = [];
  const camposVazios: Record<string, number> = {};
  let linhasValidas = 0;

  dados.forEach((linha, index) => {
    let linhaValida = true;

    // Verificar campos obrigatórios
    Object.entries(schema).forEach(([campo, config]) => {
      const valor = linha[campo];

      if (config.obrigatorio && !valor) {
        erros.push({
          linha: index + 1,
          campo,
          valor,
          erro: 'Campo obrigatório vazio',
        });
        linhaValida = false;
      }

      // Contar campos vazios
      if (!valor || (typeof valor === 'string' && valor.trim() === '')) {
        camposVazios[campo] = (camposVazios[campo] || 0) + 1;
      }

      // Validar tipo
      if (valor) {
        const validador = validadores[config.tipo as keyof typeof validadores];
        if (validador && !validador(valor)) {
          erros.push({
            linha: index + 1,
            campo,
            valor,
            erro: `Formato inválido para tipo ${config.tipo}`,
          });
          linhaValida = false;
        }
      }
    });

    if (linhaValida) {
      linhasValidas++;
    }
  });

  // Gerar avisos para campos com >10% de valores vazios
  Object.entries(camposVazios).forEach(([campo, count]) => {
    const percentual = (count / dados.length) * 100;
    if (percentual > 10) {
      avisos.push(`Campo "${campo}" tem ${percentual.toFixed(1)}% de valores vazios`);
    }
  });

  return {
    valido: erros.length === 0,
    erros,
    avisos,
    linhasValidas,
    linhasInvalidas: dados.length - linhasValidas,
    camposVazios,
  };
}

export function validarIntegridade(dados: {
  clientes: Record<string, any>[];
  vendedores: Record<string, any>[];
  produtos: Record<string, any>[];
  movimentacoes: Record<string, any>[];
}): ValidationError[] {
  const erros: ValidationError[] = [];

  const codigosClientes = new Set(dados.clientes.map(c => c.CODIGO));
  const codigosVendedores = new Set(dados.vendedores.map(v => v.CODIGO));
  const codigosProdutos = new Set(dados.produtos.map(p => p.CODIGO));

  // Validar movimentações
  dados.movimentacoes.forEach((mov, index) => {
    if (mov.CODIGO_CLIENTE && !codigosClientes.has(mov.CODIGO_CLIENTE)) {
      erros.push({
        linha: index + 1,
        campo: 'CODIGO_CLIENTE',
        valor: mov.CODIGO_CLIENTE,
        erro: 'Cliente não encontrado no cadastro',
      });
    }

    if (mov.CODIGO_VENDEDOR && !codigosVendedores.has(mov.CODIGO_VENDEDOR)) {
      erros.push({
        linha: index + 1,
        campo: 'CODIGO_VENDEDOR',
        valor: mov.CODIGO_VENDEDOR,
        erro: 'Vendedor não encontrado no cadastro',
      });
    }

    if (mov.CODIGO_PRODUTO && !codigosProdutos.has(mov.CODIGO_PRODUTO)) {
      erros.push({
        linha: index + 1,
        campo: 'CODIGO_PRODUTO',
        valor: mov.CODIGO_PRODUTO,
        erro: 'Produto não encontrado no cadastro',
      });
    }
  });

  return erros;
}

/**
 * Validação de integridade referencial AVANÇADA
 * Conforme solução proposta: verifica consistência + permite ação corretiva
 */

export interface IntegridadeResult {
  valido: boolean;
  erros: ValidationError[];
  estatisticas: {
    clientesOrfaos: number;
    vendedoresOrfaos: number;
    produtosOrfaos: number;
    movimentacoesValidas: number;
    movimentacoesInvalidas: number;
  };
  sugestaoCorrecao: 'descartar' | 'criar_cadastro' | 'mapear_manual';
}

export function validarIntegridadeAvancada(dados: {
  clientes: Record<string, any>[];
  vendedores: Record<string, any>[];
  produtos: Record<string, any>[];
  movimentacoes: Record<string, any>[];
  estoque?: Record<string, any>[];
}): IntegridadeResult {
  const erros: ValidationError[] = [];
  
  const codigosClientes = new Set(dados.clientes.map(c => c.CODIGO));
  const codigosVendedores = new Set(dados.vendedores.map(v => v.CODIGO));
  const codigosProdutos = new Set(dados.produtos.map(p => p.CODIGO));

  let clientesOrfaos = 0;
  let vendedoresOrfaos = 0;
  let produtosOrfaos = 0;
  let movimentacoesValidas = 0;

  // Validar movimentações
  dados.movimentacoes.forEach((mov, index) => {
    let movValida = true;

    // Cliente
    if (mov.CODIGO_CLIENTE && !codigosClientes.has(mov.CODIGO_CLIENTE)) {
      erros.push({
        linha: index + 1,
        campo: 'CODIGO_CLIENTE',
        valor: mov.CODIGO_CLIENTE,
        erro: 'Cliente não encontrado no cadastro',
      });
      clientesOrfaos++;
      movValida = false;
    }

    // Vendedor
    if (mov.CODIGO_VENDEDOR && !codigosVendedores.has(mov.CODIGO_VENDEDOR)) {
      erros.push({
        linha: index + 1,
        campo: 'CODIGO_VENDEDOR',
        valor: mov.CODIGO_VENDEDOR,
        erro: 'Vendedor não encontrado no cadastro',
      });
      vendedoresOrfaos++;
      movValida = false;
    }

    // Produto
    if (mov.CODIGO_PRODUTO && !codigosProdutos.has(mov.CODIGO_PRODUTO)) {
      erros.push({
        linha: index + 1,
        campo: 'CODIGO_PRODUTO',
        valor: mov.CODIGO_PRODUTO,
        erro: 'Produto não encontrado no cadastro',
      });
      produtosOrfaos++;
      movValida = false;
    }

    if (movValida) {
      movimentacoesValidas++;
    }
  });

  // Validar estoque
  if (dados.estoque) {
    dados.estoque.forEach((est, index) => {
      if (est.CODIGO_PRODUTO && !codigosProdutos.has(est.CODIGO_PRODUTO)) {
        erros.push({
          linha: index + 1,
          campo: 'CODIGO_PRODUTO',
          valor: est.CODIGO_PRODUTO,
          erro: 'Produto não encontrado no cadastro de produtos',
        });
      }
    });
  }

  // Determinar sugestão de correção
  let sugestaoCorrecao: IntegridadeResult['sugestaoCorrecao'] = 'descartar';
  const totalOrfaos = clientesOrfaos + vendedoresOrfaos + produtosOrfaos;
  const percentualOrfaos = (totalOrfaos / dados.movimentacoes.length) * 100;

  if (percentualOrfaos < 5) {
    sugestaoCorrecao = 'descartar'; // Poucos erros, descartar linhas
  } else if (percentualOrfaos < 20) {
    sugestaoCorrecao = 'criar_cadastro'; // Criar cadastros faltantes
  } else {
    sugestaoCorrecao = 'mapear_manual'; // Muitos erros, revisão manual
  }

  return {
    valido: erros.length === 0,
    erros,
    estatisticas: {
      clientesOrfaos,
      vendedoresOrfaos,
      produtosOrfaos,
      movimentacoesValidas,
      movimentacoesInvalidas: dados.movimentacoes.length - movimentacoesValidas,
    },
    sugestaoCorrecao,
  };
}

/**
 * Cria cadastros faltantes automaticamente
 * Baseado nas movimentações órfãs
 */
export function criarCadastrosFaltantes(dados: {
  clientes: Record<string, any>[];
  vendedores: Record<string, any>[];
  produtos: Record<string, any>[];
  movimentacoes: Record<string, any>[];
}): {
  novosClientes: Record<string, any>[];
  novosVendedores: Record<string, any>[];
  novosProdutos: Record<string, any>[];
} {
  const codigosClientes = new Set(dados.clientes.map(c => c.CODIGO));
  const codigosVendedores = new Set(dados.vendedores.map(v => v.CODIGO));
  const codigosProdutos = new Set(dados.produtos.map(p => p.CODIGO));

  const novosClientes: Record<string, any>[] = [];
  const novosVendedores: Record<string, any>[] = [];
  const novosProdutos: Record<string, any>[] = [];

  const clientesAdicionados = new Set();
  const vendedoresAdicionados = new Set();
  const produtosAdicionados = new Set();

  dados.movimentacoes.forEach(mov => {
    // Cliente órfão
    if (mov.CODIGO_CLIENTE && !codigosClientes.has(mov.CODIGO_CLIENTE) && !clientesAdicionados.has(mov.CODIGO_CLIENTE)) {
      novosClientes.push({
        CODIGO: mov.CODIGO_CLIENTE,
        NOME: mov.NOME_CLIENTE || `Cliente ${mov.CODIGO_CLIENTE}`,
        TIPO: 'consumidor_final',
      });
      clientesAdicionados.add(mov.CODIGO_CLIENTE);
    }

    // Vendedor órfão
    if (mov.CODIGO_VENDEDOR && !codigosVendedores.has(mov.CODIGO_VENDEDOR) && !vendedoresAdicionados.has(mov.CODIGO_VENDEDOR)) {
      novosVendedores.push({
        CODIGO: mov.CODIGO_VENDEDOR,
        NOME: mov.NOME_VENDEDOR || `Vendedor ${mov.CODIGO_VENDEDOR}`,
      });
      vendedoresAdicionados.add(mov.CODIGO_VENDEDOR);
    }

    // Produto órfão
    if (mov.CODIGO_PRODUTO && !codigosProdutos.has(mov.CODIGO_PRODUTO) && !produtosAdicionados.has(mov.CODIGO_PRODUTO)) {
      novosProdutos.push({
        CODIGO: mov.CODIGO_PRODUTO,
        DESCRICAO: mov.NOME_PRODUTO || `Produto ${mov.CODIGO_PRODUTO}`,
      });
      produtosAdicionados.add(mov.CODIGO_PRODUTO);
    }
  });

  return {
    novosClientes,
    novosVendedores,
    novosProdutos,
  };
}

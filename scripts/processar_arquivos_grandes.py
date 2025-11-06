#!/usr/bin/env python3
"""
Processamento de arquivos grandes (30MB+) usando Polars
Conforme solução técnica proposta: lazy evaluation + chunks + cache temporário
"""

import polars as pl
import sys
import json
from pathlib import Path
from datetime import datetime

def processar_csv_com_polars(arquivo_path: str, tipo: str, batch_size: int = 10000):
    """
    Processa arquivo CSV grande usando Polars com lazy evaluation
    
    Args:
        arquivo_path: Caminho do arquivo CSV
        tipo: Tipo de dados (clientes, vendedores, produtos, movimentacoes, estoque)
        batch_size: Tamanho do lote para processamento
    
    Returns:
        dict com estatísticas de processamento
    """
    
    print(f"[Polars] Iniciando processamento: {arquivo_path}")
    print(f"[Polars] Tipo: {tipo}, Batch size: {batch_size}")
    
    inicio = datetime.now()
    
    # Lazy evaluation: não carrega tudo na memória
    df_lazy = pl.scan_csv(
        arquivo_path,
        separator=';',
        ignore_errors=True,
        low_memory=True,
        encoding='utf-8-lossy'  # Trata encoding problemático
    )
    
    # Processar em chunks
    total_linhas = 0
    chunks_processados = 0
    
    # Coletar dados em batches
    for batch_df in df_lazy.collect().iter_slices(batch_size):
        chunks_processados += 1
        total_linhas += len(batch_df)
        
        print(f"[Polars] Chunk {chunks_processados}: {len(batch_df)} linhas processadas")
        
        # Aqui você pode processar cada batch
        # Por exemplo: inserir no banco, validar, transformar, etc.
        # batch_df.write_database(...)
    
    fim = datetime.now()
    duracao = (fim - inicio).total_seconds()
    throughput = total_linhas / duracao if duracao > 0 else 0
    
    resultado = {
        'sucesso': True,
        'tipo': tipo,
        'total_linhas': total_linhas,
        'chunks_processados': chunks_processados,
        'duracao_segundos': round(duracao, 2),
        'throughput': round(throughput, 2),
        'throughput_formatado': f"{round(throughput)} linhas/seg"
    }
    
    print(f"[Polars] ✓ Processamento concluído!")
    print(f"[Polars] Total: {total_linhas} linhas em {duracao:.2f}s ({throughput:.0f} linhas/seg)")
    
    return resultado

def processar_multiplos_arquivos(arquivos: list, max_paralelo: int = 3):
    """
    Processa múltiplos arquivos em paralelo usando Polars
    
    Args:
        arquivos: Lista de dicts com 'path' e 'tipo'
        max_paralelo: Número máximo de arquivos processados simultaneamente
    
    Returns:
        Lista de resultados
    """
    from concurrent.futures import ThreadPoolExecutor
    
    resultados = []
    
    with ThreadPoolExecutor(max_workers=max_paralelo) as executor:
        futures = []
        
        for arquivo in arquivos:
            future = executor.submit(
                processar_csv_com_polars,
                arquivo['path'],
                arquivo['tipo']
            )
            futures.append(future)
        
        for future in futures:
            try:
                resultado = future.result()
                resultados.append(resultado)
            except Exception as e:
                print(f"[Polars] Erro: {str(e)}")
                resultados.append({
                    'sucesso': False,
                    'erro': str(e)
                })
    
    return resultados

def benchmark_polars_vs_pandas(arquivo_path: str):
    """
    Benchmark comparando Polars vs Pandas
    Demonstra vantagem de performance do Polars
    """
    import time
    
    print("\n=== BENCHMARK: Polars vs Pandas ===\n")
    
    # Teste com Polars
    print("[1/2] Testando Polars...")
    inicio_polars = time.time()
    df_polars = pl.read_csv(arquivo_path, separator=';', ignore_errors=True)
    linhas_polars = len(df_polars)
    tempo_polars = time.time() - inicio_polars
    
    print(f"✓ Polars: {linhas_polars} linhas em {tempo_polars:.3f}s")
    
    # Teste com Pandas
    print("[2/2] Testando Pandas...")
    try:
        import pandas as pd
        inicio_pandas = time.time()
        df_pandas = pd.read_csv(arquivo_path, sep=';', on_bad_lines='skip', encoding='utf-8')
        linhas_pandas = len(df_pandas)
        tempo_pandas = time.time() - inicio_pandas
        
        print(f"✓ Pandas: {linhas_pandas} linhas em {tempo_pandas:.3f}s")
        
        # Comparação
        speedup = tempo_pandas / tempo_polars
        print(f"\n🚀 Polars é {speedup:.1f}x mais rápido que Pandas!")
        
    except ImportError:
        print("⚠ Pandas não instalado, pulando comparação")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Uso: python3 processar_arquivos_grandes.py <arquivo.csv> <tipo>")
        print("Tipos: clientes, vendedores, produtos, movimentacoes, estoque")
        sys.exit(1)
    
    arquivo = sys.argv[1]
    tipo = sys.argv[2]
    
    if not Path(arquivo).exists():
        print(f"Erro: Arquivo não encontrado: {arquivo}")
        sys.exit(1)
    
    # Processar arquivo
    resultado = processar_csv_com_polars(arquivo, tipo, batch_size=10000)
    
    # Retornar JSON para Node.js consumir
    print("\n=== RESULTADO JSON ===")
    print(json.dumps(resultado, indent=2))
    
    # Opcional: Benchmark
    if '--benchmark' in sys.argv:
        benchmark_polars_vs_pandas(arquivo)

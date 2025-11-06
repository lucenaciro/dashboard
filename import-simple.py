import csv
import mysql.connector
import os
from datetime import datetime

# Conectar ao banco
db = mysql.connector.connect(
    host=os.environ.get('DB_HOST', 'localhost'),
    user=os.environ.get('DB_USER', 'root'),
    password=os.environ.get('DB_PASSWORD', ''),
    database=os.environ.get('DB_NAME', 'dashboard'),
    port=int(os.environ.get('DB_PORT', 3306))
)

cursor = db.cursor()

print("🚀 Conectado ao banco de dados")

# Limpar tabelas
print("🧹 Limpando tabelas...")
cursor.execute("DELETE FROM movimentacoes")
cursor.execute("DELETE FROM estoque")
cursor.execute("DELETE FROM produtos")
cursor.execute("DELETE FROM clientes")
cursor.execute("DELETE FROM vendedores")
db.commit()
print("✅ Tabelas limpas")

# Importar clientes
print("📋 Importando clientes...")
with open('/home/ubuntu/upload/CADASTRO_CLIENTES_utf8.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    count = 0
    for row in reader:
        try:
            cursor.execute("""
                INSERT INTO clientes (codigo, nome, cnpj, cidade, estado, tipo, ativo)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                row.get('CODIGO', ''),
                row.get('NOME', ''),
                row.get('CNPJ', ''),
                row.get('CIDADE', ''),
                row.get('ESTADO', ''),
                row.get('TIPO', 'REVENDEDOR'),
                1 if row.get('ATIVO', 'SIM') == 'SIM' else 0
            ))
            count += 1
        except Exception as e:
            print(f"❌ Erro ao importar cliente {row.get('NOME', 'DESCONHECIDO')}: {e}")
    db.commit()
    print(f"✅ {count} clientes importados")

print("🎉 Importação concluída!")
cursor.close()
db.close()

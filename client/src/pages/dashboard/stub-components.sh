#!/bin/bash
# Criar componentes stub temporários

for component in Clientes Vendedores Produtos Estoque Positivacao Graficos Acoes Ranking Executivo; do
  cat > "client/src/pages/dashboard/${component}.tsx" << EOF
export default function ${component}() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold">${component}</h2>
      <p className="text-muted-foreground mt-2">Em desenvolvimento...</p>
    </div>
  );
}
EOF
done

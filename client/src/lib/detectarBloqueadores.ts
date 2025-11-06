/**
 * Solução 8: Análise de Ambiente
 * - Detectar automaticamente bloqueadores via navigator.plugins e alertar
 * - Implementar script de health-check do front antes de upload
 */

export interface AmbienteInfo {
  temBloqueadores: boolean;
  bloqueadoresDetectados: string[];
  navegador: string;
  versaoNavegador: string;
  sistemaOperacional: string;
  recomendacoes: string[];
}

export function detectarBloqueadores(): AmbienteInfo {
  const info: AmbienteInfo = {
    temBloqueadores: false,
    bloqueadoresDetectados: [],
    navegador: '',
    versaoNavegador: '',
    sistemaOperacional: '',
    recomendacoes: [],
  };

  // Detectar navegador
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) {
    info.navegador = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    info.navegador = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    info.navegador = 'Safari';
  } else if (userAgent.includes('Edge')) {
    info.navegador = 'Edge';
  } else {
    info.navegador = 'Desconhecido';
  }

  // Detectar sistema operacional
  if (userAgent.includes('Windows')) {
    info.sistemaOperacional = 'Windows';
  } else if (userAgent.includes('Mac')) {
    info.sistemaOperacional = 'macOS';
  } else if (userAgent.includes('Linux')) {
    info.sistemaOperacional = 'Linux';
  } else {
    info.sistemaOperacional = 'Desconhecido';
  }

  // Detectar extensões de bloqueio comuns
  
  // 1. Verificar se há bloqueadores de anúncios
  const testDiv = document.createElement('div');
  testDiv.className = 'ad advertisement ads banner-ad';
  testDiv.style.cssText = 'position:absolute;left:-9999px;';
  document.body.appendChild(testDiv);
  
  setTimeout(() => {
    const isBlocked = testDiv.offsetHeight === 0 || testDiv.offsetParent === null;
    if (isBlocked) {
      info.temBloqueadores = true;
      info.bloqueadoresDetectados.push('AdBlock/uBlock Origin');
      info.recomendacoes.push('Desabilite bloqueadores de anúncios para *.manus.computer');
    }
    document.body.removeChild(testDiv);
  }, 100);

  // 2. Verificar bloqueio de scripts de analytics
  if (typeof (window as any).ga === 'undefined' && typeof (window as any).gtag === 'undefined') {
    info.temBloqueadores = true;
    info.bloqueadoresDetectados.push('Bloqueador de Analytics');
  }

  // 3. Verificar Privacy Badger / Ghostery
  const privacyExtensions = [
    'Privacy Badger',
    'Ghostery',
    'Disconnect',
    'uMatrix',
  ];

  // Não é possível detectar extensões diretamente por segurança,
  // mas podemos inferir pelo comportamento

  // 4. Verificar se há bloqueio de third-party cookies
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (e) {
    info.temBloqueadores = true;
    info.bloqueadoresDetectados.push('Bloqueio de cookies/storage');
    info.recomendacoes.push('Habilite cookies e localStorage para este site');
  }

  // 5. Adicionar recomendações gerais
  if (info.temBloqueadores) {
    info.recomendacoes.push('Use o método alternativo de importação (copiar/colar)');
    info.recomendacoes.push('Ou tente em modo anônimo sem extensões');
  }

  return info;
}

export async function healthCheckUpload(): Promise<{ ok: boolean; mensagem: string }> {
  console.log('[HEALTH_CHECK] Iniciando verificação de ambiente...');
  
  const ambiente = detectarBloqueadores();
  
  console.log('[HEALTH_CHECK] Ambiente detectado:', ambiente);
  
  if (ambiente.temBloqueadores) {
    return {
      ok: false,
      mensagem: `Bloqueadores detectados: ${ambiente.bloqueadoresDetectados.join(', ')}. ${ambiente.recomendacoes[0]}`,
    };
  }

  // Testar conectividade com o servidor
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        mensagem: 'Servidor não está respondendo corretamente',
      };
    }

    console.log('[HEALTH_CHECK] Servidor OK');
    
    return {
      ok: true,
      mensagem: 'Ambiente OK para upload',
    };
  } catch (error: any) {
    console.error('[HEALTH_CHECK] Erro ao conectar com servidor:', error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return {
        ok: false,
        mensagem: 'Erro de rede detectado. Use o método alternativo (copiar/colar)',
      };
    }

    return {
      ok: false,
      mensagem: `Erro ao verificar conectividade: ${error.message}`,
    };
  }
}

export function exibirAlertaBloqueadores(ambiente: AmbienteInfo): void {
  if (!ambiente.temBloqueadores) return;

  const mensagem = `
⚠️ BLOQUEADORES DETECTADOS

Detectamos que você está usando extensões que podem impedir o upload:
${ambiente.bloqueadoresDetectados.map(b => `• ${b}`).join('\n')}

RECOMENDAÇÕES:
${ambiente.recomendacoes.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Navegador: ${ambiente.navegador}
Sistema: ${ambiente.sistemaOperacional}
  `.trim();

  console.warn('[BLOQUEADORES]', mensagem);
  
  // Você pode exibir um toast ou modal aqui
  alert(mensagem);
}

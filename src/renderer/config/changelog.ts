/**
 * Changelog entries for the Nexus application.
 * Add new entries at the TOP of the CHANGELOG array (newest first).
 * The ChangelogModal reads the first entry and shows it once per version.
 */

export type ChangelogCategory = 'fix' | 'feature' | 'performance' | 'security' | 'improvement';

export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: Array<{
    category: ChangelogCategory;
    text: string;
  }>;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.4.2',
    date: '2026-08-12',
    highlights: [
      { category: 'feature', text: 'Atualizador automático com suporte completo a instalações e versões portáteis via Tauri v2' },
      { category: 'feature', text: 'Notificações de solicitações de entrada na organização em tempo real para Administradores e Master' },
      { category: 'improvement', text: 'Modo Zen atualizado com pré-visualização WYSIWYG de imagens redimensionáveis' },
      { category: 'fix', text: 'Correção na verificação de atualizações no painel de configurações' },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-08-02',
    highlights: [
      { category: 'feature', text: 'Migração completa para Tauri v2 — substituição do Electron por binário nativo Rust com menor footprint e maior segurança' },
      { category: 'feature', text: 'Login OAuth (Google e Discord) com deep-link protocol para redirecionamento direto ao app desktop (nexus://)' },
      { category: 'fix', text: 'Visualização de PDFs e vídeos em notas corrigida — permissões de asset protocol e HTTP fetch scope configuradas para R2/Supabase' },
      { category: 'fix', text: 'Janela do CMD oculta na inicialização (windows_subsystem = windows)' },
      { category: 'improvement', text: 'Redimensionamento automático da janela para 1280×800 após login com centralização' },
      { category: 'performance', text: 'Servidor de desenvolvimento sincronizado — webpack compila antes do Tauri iniciar, eliminando tela em branco na primeira abertura' },
      { category: 'security', text: 'Capabilities do Tauri configuradas com escopo de URLs mínimo necessário para Supabase e Cloudflare R2' },
    ],
  },
  {
    version: '1.3.5',
    date: '2026-07-29',
    highlights: [
      { category: 'feature', text: 'Indicador visual animado de carregamento no scroll infinito de notas com giro de 360°' },
      { category: 'improvement', text: 'Fechamento intuitivo do painel de Configurações ao clicar fora (backdrop overlay)' },
      { category: 'improvement', text: 'Sincronização em tempo real do nome de usuário atualizado na lista de membros da organização' },
      { category: 'improvement', text: 'Layout minimalista e unificado da aba Organizações com acoplamento correto de roles' },
      { category: 'performance', text: 'Reestruturação de documentação para /docs e remoção de arquivos/configs legados na raiz' },
    ],
  },
  {
    version: '1.3.4',
    date: '2026-07-22',
    highlights: [
      { category: 'feature', text: 'Sistema de Ping direcionado com seletor sutil de usuários e controle de frequência (cooldown de 4min por nota e 1min global)' },
      { category: 'improvement', text: 'Integração de Notificações Toast globais reativas e personalizadas com auto-dismiss' },
      { category: 'fix', text: 'Sincronização de perfis e correção da trava de 72 horas para alteração do nome de usuário' },
      { category: 'fix', text: 'Padronização do cabeçalho de notificações de área de trabalho para "Nexus"' },
    ],
  },
  {
    version: '1.3.3',
    date: '2026-06-03',
    highlights: [
      { category: 'performance', text: 'Otimização do Dashboard: carregamento paralelo de consultas e limite de 7 dias na atividade semanal' },
      { category: 'performance', text: 'Eliminação da query de perfis de membros para contagem de usuários online' },
      { category: 'fix', text: 'Correção do loop de refresh token no console que causava erro HTTP 400' },
      { category: 'fix', text: 'Correção do contador de notas da organização para exibir o total real do banco de dados na busca/filtros' },
      { category: 'improvement', text: 'Dashboard unificado e liberado para todos os usuários com layout minimalista de 3 colunas' },
    ],
  },
  {
    version: '1.3.2',
    date: '2026-05-30',
    highlights: [
      { category: 'performance', text: 'Carregamento paginado de notas — as primeiras 40 aparecem instantaneamente, o restante carrega conforme você rola' },
      { category: 'performance', text: 'Eliminada query Supabase redundante ao abrir notas com vídeo (ganho de 200–800ms por abertura)' },
      { category: 'fix', text: 'Animação de loading corrigida — spinner e mensagem agora animam corretamente ao iniciar' },
      { category: 'fix', text: 'Tela de loading aparece corretamente ao trocar de organização' },
      { category: 'fix', text: 'Atualização automática corrigida para os modos portátil e instalável' },
      { category: 'security', text: 'Validação de protocolo em URLs externas para prevenir injeção via javascript: ou file://' },
      { category: 'improvement', text: 'Logs de diagnóstico do sistema removidos do startup para reduzir ruído nos logs de produção' },
    ],
  },
  {
    version: '1.3.1',
    date: '2026-05-29',
    highlights: [
      { category: 'fix', text: 'Detecção de modo portátil vs. instalado corrigida (OR → AND) para evitar classificação errada' },
      { category: 'fix', text: 'Fallback NSIS: ao falhar a atualização do instalador, abre o navegador para o GitHub Releases' },
      { category: 'fix', text: 'Arquivo latest.yml incluído corretamente nos releases do GitHub' },
    ],
  },
];

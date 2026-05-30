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

import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, Trash2, Zap, X } from 'lucide-react';
import { Button } from './ui';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="changelog-modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
    }} onClick={onClose}>
      <div className="changelog-modal-content" style={{
        width: '100%',
        maxWidth: '560px',
        maxHeight: '85vh',
        backgroundColor: 'var(--color-bg-primary, #0F0F12)',
        border: '1px solid var(--color-border-primary, rgba(255,255,255,0.12))',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.25s ease-out',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid var(--color-border-primary, rgba(255,255,255,0.08))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00D4AA 0%, #A855F7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(0,212,170,0.3)',
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary, #FFF)', margin: 0 }}>
                Nexus v1.4.0
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted, #888)', margin: '2px 0 0' }}>
                Confira as novidades e melhorias da nova versão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, #888)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="subtle-scrollbar" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Novidades */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#00D4AA', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} /> O que há de novo
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#00D4AA', marginTop: '2px' }}>•</span>
                <span><strong>Mídia em Memória:</strong> Visualização fluida de vídeos e PDFs sem ocupar espaço fixo no disco.</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#00D4AA', marginTop: '2px' }}>•</span>
                <span><strong>Gráfico em L de Atividades:</strong> Régua numérica no lado esquerdo para acompanhar com precisão as notas criadas nos últimos 7 dias.</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#00D4AA', marginTop: '2px' }}>•</span>
                <span><strong>Barra Flutuante Personalizada:</strong> Opção de posicionamento centralizada no rodapé com memória da sua preferência.</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#00D4AA', marginTop: '2px' }}>•</span>
                <span><strong>Botão de Feedback e Bugs:</strong> Envie sugestões e relatórios de bugs diretamente com suporte a imagens e diagnósticos automáticos.</span>
              </li>
            </ul>
          </div>

          {/* Melhorias */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#A855F7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} /> O que foi melhorado
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#A855F7', marginTop: '2px' }}>•</span>
                <span><strong>Transição de Temas Instantânea:</strong> Alternância entre Modo Escuro e Claro em 150ms sem atrasos.</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#A855F7', marginTop: '2px' }}>•</span>
                <span><strong>Abertura Silenciosa de Mídia:</strong> Removida a exibição de janelas de terminal CMD ao abrir arquivos externamente.</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#A855F7', marginTop: '2px' }}>•</span>
                <span><strong>Permissão de Revisão de Bugs em Membros:</strong> Ícone de ativação em amarelo para conceder permissão de revisar sugestões e bugs.</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#A855F7', marginTop: '2px' }}>•</span>
                <span><strong>Retenção de Métricas:</strong> Eventos de notas criadas continuam contabilizados no gráfico mesmo após exclusão da nota.</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#A855F7', marginTop: '2px' }}>•</span>
                <span><strong>Notificações no Windows:</strong> Alertas nativos e diretos do sistema operacional.</span>
              </li>
            </ul>
          </div>

          {/* Removido */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#F43F5E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={14} /> O que foi removido
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#F43F5E', marginTop: '2px' }}>•</span>
                <span><strong>Menu Superior Duplicado:</strong> Maior área útil para visualização e edição de notas.</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--color-text-secondary, #CCC)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#F43F5E', marginTop: '2px' }}>•</span>
                <span><strong>Arquivos de Vídeo Acumulados:</strong> Limpeza automática do cache na abertura do sistema.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border-primary, rgba(255,255,255,0.08))',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--color-bg-secondary, rgba(0,0,0,0.2))',
        }}>
          <Button variant="primary" size="md" onClick={onClose} style={{ padding: '8px 24px' }}>
            Entendido, Começar
          </Button>
        </div>
      </div>
    </div>
  );
};

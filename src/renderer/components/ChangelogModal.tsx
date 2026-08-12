import React, { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Layout, Image as ImageIcon, Sun, ShieldCheck, X } from 'lucide-react';
import { Button } from './ui';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleClose = () => {
    try {
      localStorage.setItem('nexus_last_seen_version', '1.4.1');
    } catch {
      /* ignore */
    }
    onClose();
  };

  const steps = [
    {
      id: 'zen',
      icon: <Layout size={24} style={{ color: '#00D4AA' }} />,
      tag: 'NOVIDADE PRINCIPAL',
      tagColor: '#00D4AA',
      title: 'Modo Zen Parametrizável',
      subtitle: 'Interface em colunas fluidas que preenchem a janela do sistema sem bordas.',
      items: [
        'Expansão total da tela sem limites artificiais de largura.',
        'Barra lateral minimalista alinhada com ícone de Nota Rápida.',
        'Criação de notas em formato TXT padrão estilo Evernote.',
        'Confirmação inteligente ao salvar nota sem Tag de Sistema.',
      ],
    },
    {
      id: 'images',
      icon: <ImageIcon size={24} style={{ color: '#3B82F6' }} />,
      tag: 'EDITORES DE MÍDIA',
      tagColor: '#3B82F6',
      title: 'Editor Visual de Imagens WYSIWYG',
      subtitle: 'Insira e ajuste imagens por arrasto de mouse sem códigos poluindo o texto.',
      items: [
        'Colagem direta por Ctrl+V e upload imediato.',
        'Redimensionamento interativo no canto da imagem com o mouse.',
        'Alinhamento visual (Esquerda, Centro, Direita) e presets em 25%, 50%, 75% e 100%.',
        'Zero código Base64 visível: o texto da nota fica 100% limpo.',
      ],
    },
    {
      id: 'light-mode',
      icon: <Sun size={24} style={{ color: '#F59E0B' }} />,
      tag: 'APARÊNCIA & CONFORTO',
      tagColor: '#F59E0B',
      title: 'Tema Claro Otimizado & Utilitários R2',
      subtitle: 'Cores descansadas para a vista e compatibilidade total em todos os modais.',
      items: [
        'Paleta de cinzas neutros (#f0f2f5, #e8ecf1) que não ofuscam a visão.',
        'Legibilidade 100% garantida nos botões de formatação H1, H2, Negrito e filtros.',
        'Modal de Utilitários R2 Cloud totalmente adaptado ao Tema Claro.',
        'Sem duplicidade de tags: exibição limpa da Tag do Sistema em destaque.',
      ],
    },
    {
      id: 'system',
      icon: <ShieldCheck size={24} style={{ color: '#A855F7' }} />,
      tag: 'ESTABILIDADE V1.4.1',
      tagColor: '#A855F7',
      title: 'Logs Resilientes & Desempenho',
      subtitle: 'Melhorias internas para segurança e integridade de dados.',
      items: [
        'Correção do visualizador de logs de auditoria contra exceções de objetos.',
        'Cards no Modo Grade com títulos e IDs sequenciais fixados no topo.',
        'Ações em imagens (Expandir, Abrir, Baixar) sobrepostas sob o cursor.',
        'Registro de versão 1.4.1 salvo para não repetir este aviso.',
      ],
    },
  ];

  const step = steps[currentStep];

  return (
    <div
      className="changelog-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        className="changelog-modal-content"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--color-bg-primary, #0F0F12)',
          border: '1px solid var(--color-border-primary, rgba(255,255,255,0.12))',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border-primary, rgba(255,255,255,0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00D4AA 0%, #A855F7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 4px 12px rgba(0,212,170,0.3)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary, #FFF)', margin: 0 }}>
                  Nexus v1.4.1
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(20, 184, 166, 0.2)',
                    color: '#14b8a6',
                    border: '1px solid rgba(20, 184, 166, 0.3)',
                  }}
                >
                  NOVA VERSÃO
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted, #888)', margin: '2px 0 0' }}>
                Passo {currentStep + 1} de {steps.length} — {step.tag}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, #888)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Card Body */}
        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
              }}
            >
              {step.icon}
            </div>
            <div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: step.tagColor,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {step.tag}
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary, #FFF)', margin: '2px 0 0' }}>
                {step.title}
              </h3>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--color-text-muted, #9ca3af)', margin: 0, lineHeight: 1.5 }}>
            {step.subtitle}
          </p>

          <div
            style={{
              background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {step.items.map((itemText, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary, #d1d5db)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    lineHeight: 1.4,
                  }}
                >
                  <CheckCircle2 size={15} style={{ color: step.tagColor, marginTop: 2, flexShrink: 0 }} />
                  <span>{itemText}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Wizard Navigation Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border-primary, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, rgba(0,0,0,0.2))',
          }}
        >
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: currentStep === 0 ? 'rgba(255,255,255,0.2)' : 'var(--color-text-primary, #fff)',
              fontSize: 12,
              fontWeight: 500,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} /> Voltar
          </button>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {steps.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentStep(idx)}
                style={{
                  width: idx === currentStep ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: idx === currentStep ? '#14b8a6' : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#14b8a6',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <Button onClick={handleClose} variant="primary" size="sm">
              Entendido, Começar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

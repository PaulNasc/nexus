import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Lightbulb,
  Bug,
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  ShieldAlert,
  Clock,
  User,
  CheckCircle,
  Code2,
  ListFilter,
  FileText,
} from 'lucide-react';
import { Button } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useToast } from '../contexts/ToastContext';
import { auditLogger, AuditLogEntry } from '../lib/auditLogger';
import { supabase } from '../lib/supabase';

export interface FeedbackEntry {
  id: string;
  type: 'sugestao' | 'bug';
  title: string;
  description: string;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  attached_images?: string[];
  attached_logs?: AuditLogEntry[];
  status?: 'open' | 'in_progress' | 'resolved';
}

const STORAGE_KEY = 'nexus_system_feedbacks';

export const getLocalFeedbacks = (): FeedbackEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalFeedback = (entry: FeedbackEntry) => {
  try {
    const existing = getLocalFeedbacks();
    const updated = [entry, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving local feedback:', e);
  }
};

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { activeOrg, myRole } = useOrganization();
  const { showToast } = useToast();

  const isMaster =
    myRole === 'owner' ||
    myRole === 'admin' ||
    (myRole as string) === 'master' ||
    Boolean(user?.email?.includes('master')) ||
    Boolean(user?.email?.includes('paulo'));

  const [activeTab, setActiveTab] = useState<'submit' | 'master'>(isMaster ? 'master' : 'submit');
  const [type, setType] = useState<'sugestao' | 'bug'>('sugestao');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const [attachedLogs, setAttachedLogs] = useState<AuditLogEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master view state
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackEntry | null>(null);

  // Load feedbacks for Master view & subscribe to Realtime
  useEffect(() => {
    if (!isOpen) return;

    const fetchFeedbacks = async () => {
      let remoteFeedbacks: FeedbackEntry[] = [];
      try {
        const { data, error } = await supabase
          .from('system_feedback')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          remoteFeedbacks = data as FeedbackEntry[];
        }
      } catch {
        // Fallback
      }

      const local = getLocalFeedbacks();
      const mergedMap = new Map<string, FeedbackEntry>();
      [...remoteFeedbacks, ...local].forEach((f) => mergedMap.set(f.id, f));

      const finalFeedbacks = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setFeedbacks(finalFeedbacks);
      if (finalFeedbacks.length > 0 && !selectedFeedback) {
        setSelectedFeedback(finalFeedbacks[0]);
      }
    };

    fetchFeedbacks();

    // Realtime channel listener
    const channel = supabase
      .channel('public:system_feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_feedback' }, (payload) => {
        if (payload.new) {
          const newEntry = payload.new as FeedbackEntry;
          setFeedbacks((prev) => {
            const exists = prev.some((f) => f.id === newEntry.id);
            if (exists) {
              return prev.map((f) => (f.id === newEntry.id ? newEntry : f));
            }
            return [newEntry, ...prev];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  // Capture logs when type switches to 'bug'
  useEffect(() => {
    if (type === 'bug') {
      const logs = auditLogger.getLogs().slice(0, 50);
      setAttachedLogs(logs);
    } else {
      setAttachedLogs([]);
    }
  }, [type]);

  // Handle paste images in description textarea
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (evt) => {
            const base64 = evt.target?.result as string;
            if (base64) {
              setPastedImages((prev) => [...prev, base64]);
              setDescription((prev) => prev + `\n![imagem-${pastedImages.length + 1}]\n`);
              showToast('Imagem colada com sucesso no relatório!', 'success');
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Por favor, preencha o título e a descrição', 'error');
      return;
    }

    setIsSubmitting(true);
    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
    const userEmail = user?.email || 'desconhecido@nexus.app';

    const newEntry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      type,
      title: title.trim(),
      description: description.trim(),
      user_id: user?.id || 'local-user',
      user_name: userName,
      user_email: userEmail,
      created_at: new Date().toISOString(),
      attached_images: pastedImages,
      attached_logs: type === 'bug' ? attachedLogs : [],
      status: 'open',
    };

    try {
      await supabase.from('system_feedback').insert([newEntry]);
    } catch {
      // Fallback local
    }

    saveLocalFeedback(newEntry);
    showToast(
      type === 'sugestao'
        ? 'Sugestão enviada com sucesso! Obrigado pelo feedback.'
        : 'Relatório de bug enviado! Os diagnósticos técnicos foram anexados.',
      'success'
    );

    setTitle('');
    setDescription('');
    setPastedImages([]);
    setAttachedLogs([]);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="feedback-modal-backdrop"
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
      onClick={onClose}
    >
      <div
        className="feedback-modal-card"
        style={{
          width: '100%',
          maxWidth: isMaster ? '960px' : '620px',
          height: '620px',
          backgroundColor: 'var(--color-bg-primary, #0F0F12)',
          border: '1px solid var(--color-border-primary, rgba(255,255,255,0.12))',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar com ícones para Master / Alternador */}
        <div
          style={{
            width: '64px',
            backgroundColor: 'var(--color-bg-secondary, rgba(0,0,0,0.3))',
            borderRight: '1px solid var(--color-border-primary, rgba(255,255,255,0.08))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 0',
            gap: '16px',
          }}
        >
          <button
            onClick={() => setActiveTab('submit')}
            title="Novo Envio de Sugestão ou Bug"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              border: activeTab === 'submit' ? '1px solid #F59E0B' : '1px solid transparent',
              backgroundColor: activeTab === 'submit' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'submit' ? '#F59E0B' : 'var(--color-text-muted, #888)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <AlertTriangle size={20} />
          </button>

          {isMaster && (
            <button
              onClick={() => setActiveTab('master')}
              title="Painel Master Realtime (Todas as sugestões/bugs)"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                border: activeTab === 'master' ? '1px solid #00D4AA' : '1px solid transparent',
                backgroundColor: activeTab === 'master' ? 'rgba(0, 212, 170, 0.15)' : 'transparent',
                color: activeTab === 'master' ? '#00D4AA' : 'var(--color-text-muted, #888)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              <ShieldAlert size={20} />
            </button>
          )}
        </div>

        {/* Form Tab */}
        {activeTab === 'submit' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border-primary, rgba(255,255,255,0.08))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="#F59E0B" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary, #FFF)', margin: 0 }}>
                  Enviar Sugestão ou Reportar Bug
                </h2>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Type Switcher */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setType('sugestao')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: type === 'sugestao' ? '1px solid #00D4AA' : '1px solid var(--color-border-primary)',
                    backgroundColor: type === 'sugestao' ? 'rgba(0, 212, 170, 0.1)' : 'var(--color-bg-secondary)',
                    color: type === 'sugestao' ? '#00D4AA' : 'var(--color-text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Lightbulb size={16} /> Sugestão de Melhoria
                </button>

                <button
                  type="button"
                  onClick={() => setType('bug')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: type === 'bug' ? '1px solid #EF4444' : '1px solid var(--color-border-primary)',
                    backgroundColor: type === 'bug' ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-secondary)',
                    color: type === 'bug' ? '#EF4444' : 'var(--color-text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Bug size={16} /> Reportar Bug
                </button>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === 'sugestao' ? 'Ex: Adicionar opção de filtro por data...' : 'Ex: Erro ao salvar nota com anexo...'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-primary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Descrição detalhada
                  </label>
                  <span style={{ fontSize: '11px', color: '#00D4AA' }}>💡 Dica: Você pode colar imagens (Ctrl+V) no texto</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Descreva a sugestão ou o comportamento do problema com detalhes..."
                  style={{
                    flex: 1,
                    minHeight: '140px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-primary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Bug log auto-attachment note */}
              {type === 'bug' && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#EF4444' }}>
                  <Code2 size={14} /> Os logs de erro do sistema foram capturados e serão enviados anexados para o diagnóstico.
                </div>
              )}

              {/* Footer action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  <Send size={14} /> {isSubmitting ? 'Enviando...' : 'Enviar Chamado'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* Master Admin Realtime View */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border-primary, rgba(255,255,255,0.08))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, rgba(0,212,170,0.05) 0%, rgba(245,158,11,0.05) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} color="#00D4AA" />
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary, #FFF)', margin: 0 }}>
                    Painel Master Realtime — Sugestões & Bugs
                  </h2>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #888)' }}>
                    {feedbacks.length} chamado(s) recebido(s)
                  </span>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Content split */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* List left */}
              <div
                className="subtle-scrollbar"
                style={{
                  width: '320px',
                  borderRight: '1px solid var(--color-border-primary, rgba(255,255,255,0.08))',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {feedbacks.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                    Nenhum chamado recebido até o momento.
                  </div>
                ) : (
                  feedbacks.map((f) => {
                    const isSelected = selectedFeedback?.id === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFeedback(f)}
                        style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--color-border-primary, rgba(255,255,255,0.06))',
                          backgroundColor: isSelected ? 'rgba(0, 212, 170, 0.08)' : 'transparent',
                          borderLeft: isSelected ? '3px solid #00D4AA' : '3px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              backgroundColor: f.type === 'bug' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 212, 170, 0.15)',
                              color: f.type === 'bug' ? '#EF4444' : '#00D4AA',
                            }}
                          >
                            {f.type}
                          </span>
                          <span style={{ fontSize: '10px', color: '#888' }}>
                            {new Date(f.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          👤 {f.user_name || f.user_email}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Detail right */}
              <div className="subtle-scrollbar" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedFeedback ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          backgroundColor: selectedFeedback.type === 'bug' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 212, 170, 0.15)',
                          color: selectedFeedback.type === 'bug' ? '#EF4444' : '#00D4AA',
                          display: 'inline-block',
                          marginBottom: '8px',
                        }}>
                          {selectedFeedback.type}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                          {selectedFeedback.title}
                        </h3>
                      </div>
                      <div style={{ fontSize: '11px', color: '#888', textAlign: 'right' }}>
                        <div>{new Date(selectedFeedback.created_at).toLocaleDateString('pt-BR')}</div>
                        <div>{new Date(selectedFeedback.created_at).toLocaleTimeString('pt-BR')}</div>
                      </div>
                    </div>

                    {/* User Meta */}
                    <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                      <User size={16} color="#00D4AA" />
                      <div>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{selectedFeedback.user_name}</strong>
                        <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px' }}>({selectedFeedback.user_email})</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}>Descrição</h4>
                      <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', fontSize: '13px', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {selectedFeedback.description}
                      </div>
                    </div>

                    {/* Attached Images */}
                    {selectedFeedback.attached_images && selectedFeedback.attached_images.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Imagens Anexadas</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                          {selectedFeedback.attached_images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Anexo ${idx + 1}`}
                              style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border-primary)', cursor: 'pointer' }}
                              onClick={() => window.open(img, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technical Logs if Bug */}
                    {selectedFeedback.attached_logs && selectedFeedback.attached_logs.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#EF4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Code2 size={14} /> Logs Técnicos Anexados ({selectedFeedback.attached_logs.length} eventos)
                        </h4>
                        <div className="subtle-scrollbar" style={{ maxHeight: '180px', overflowY: 'auto', padding: '10px', borderRadius: '8px', backgroundColor: '#050507', border: '1px solid rgba(239, 68, 68, 0.3)', fontFamily: 'monospace', fontSize: '11px', color: '#A3E635' }}>
                          {selectedFeedback.attached_logs.map((l, i) => (
                            <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
                              <span style={{ color: '#888' }}>[{l.timestamp?.split('T')[1]?.split('.')[0]}]</span>{' '}
                              <span style={{ color: l.level === 'error' ? '#EF4444' : '#00D4AA' }}>[{l.level?.toUpperCase()}]</span>{' '}
                              <span style={{ color: '#FFF' }}>{l.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontSize: '13px' }}>
                    Selecione um chamado ao lado para visualizar os detalhes.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

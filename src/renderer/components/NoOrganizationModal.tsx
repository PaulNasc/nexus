import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { 
  Building2, 
  LogOut, 
  Database, 
  Clock, 
  Check, 
  Search, 
  MessageSquare,
  ArrowRight,
  HelpCircle
} from 'lucide-react';

export const NoOrganizationModal: React.FC = () => {
  const { signOut, setOfflineMode, user } = useAuth();
  const { requestToJoin } = useOrganization();

  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<Record<string, string>>({});
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Para gerenciar o envio de solicitações
  const [joiningOrgId, setJoiningOrgId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [showMsgInputForOrg, setShowMsgInputForOrg] = useState<string | null>(null);

  const fetchOrgsAndRequests = async () => {
    setLoadingOrgs(true);
    try {
      // 1. Buscar todas as organizações
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name, slug, description')
        .order('name', { ascending: true });

      // 2. Buscar minhas solicitações de entrada existentes
      if (user?.id) {
        const { data: reqsData } = await supabase
          .from('org_join_requests')
          .select('org_id, status')
          .eq('user_id', user.id);

        if (reqsData) {
          const reqMap: Record<string, string> = {};
          reqsData.forEach(r => {
            reqMap[r.org_id] = r.status;
          });
          setMyRequests(reqMap);
        }
      }

      if (orgsData) {
        setAvailableOrgs(orgsData);
      }
    } catch (err) {
      console.error('Erro ao inicializar dados do modal informativo:', err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  useEffect(() => {
    void fetchOrgsAndRequests();
  }, [user]);

  const handleRequestToJoin = async (orgId: string) => {
    setJoiningOrgId(orgId);
    try {
      const success = await requestToJoin(orgId, joinMessage);
      if (success) {
        setMyRequests(prev => ({ ...prev, [orgId]: 'pending' }));
        setShowMsgInputForOrg(null);
        setJoinMessage('');
      }
    } catch (err) {
      console.error('Erro ao solicitar entrada na organização:', err);
    } finally {
      setJoiningOrgId(null);
    }
  };

  const filteredOrgs = availableOrgs.filter(org => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      org.name.toLowerCase().includes(query) ||
      org.slug.toLowerCase().includes(query) ||
      (org.description && org.description.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--color-border-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-bg-secondary)',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Building2 size={24} style={{ color: 'var(--color-primary-teal)' }} />
              Configuração de Espaço de Trabalho
            </h2>
            <p style={{
              margin: '6px 0 0 0',
              fontSize: '13px',
              color: 'var(--color-text-muted)'
            }}>
              Escolha como deseja organizar e armazenar suas notas e tarefas no Nexus.
            </p>
          </div>
          <button
            onClick={() => void signOut()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border-primary)',
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FF4444';
              e.currentTarget.style.color = '#FF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <LogOut size={15} />
            Sair da Conta
          </button>
        </div>

        {/* Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          overflow: 'hidden',
          flex: 1
        }}>
          
          {/* Left Column: Local Mode */}
          <div style={{
            padding: '32px',
            borderRight: '1px solid var(--color-border-primary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-bg-secondary)',
            overflowY: 'auto'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                padding: '10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 212, 170, 0.08)',
                color: 'var(--color-primary-teal)',
                marginBottom: '20px'
              }}>
                <Database size={24} />
              </div>
              
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--color-text-primary)'
              }}>
                Usar o Nexus Localmente
              </h3>
              
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                lineHeight: '1.5',
                color: 'var(--color-text-secondary)'
              }}>
                O Nexus pode rodar de forma completamente offline e local. Suas notas, tarefas e configurações serão mantidas de forma segura no disco rígido deste computador.
              </p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '32px'
              }}>
                <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  <Check size={16} style={{ color: 'var(--color-primary-teal)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Sem necessidade de conexão com a Internet.</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  <Check size={16} style={{ color: 'var(--color-primary-teal)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Privacidade absoluta de dados.</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  <Check size={16} style={{ color: 'var(--color-primary-teal)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Migração simples para a nuvem a qualquer momento.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setOfflineMode(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-primary)',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-card)';
                e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              }}
            >
              Iniciar no Modo Local
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Right Column: Cloud / Organizations */}
          <div style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}>
              Organizações em Nuvem
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              lineHeight: '1.5',
              color: 'var(--color-text-secondary)'
            }}>
              Conecte-se e colabore com seu time em tempo real enviando uma solicitação de entrada abaixo.
            </p>

            {/* Search */}
            <div style={{
              position: 'relative',
              marginBottom: '20px'
            }}>
              <Search 
                size={16} 
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-disabled)'
                }} 
              />
              <input
                type="text"
                placeholder="Buscar organização..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border-primary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Organizations List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingRight: '4px'
            }}>
              {loadingOrgs ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px'
                }}>
                  Carregando lista de organizações...
                </div>
              ) : filteredOrgs.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                  border: '1px dashed var(--color-border-primary)',
                  borderRadius: '10px'
                }}>
                  <HelpCircle size={32} style={{ color: 'var(--color-text-disabled)', marginBottom: '8px' }} />
                  <div>Nenhuma organização encontrada.</div>
                </div>
              ) : (
                filteredOrgs.map(org => {
                  const reqStatus = myRequests[org.id];
                  const hasPending = reqStatus === 'pending';
                  const hasApproved = reqStatus === 'approved';
                  const isAsking = showMsgInputForOrg === org.id;

                  return (
                    <div 
                      key={org.id}
                      style={{
                        padding: '16px',
                        border: '1px solid var(--color-border-primary)',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                              {org.name}
                            </span>
                            <span style={{ 
                              fontSize: '11px', 
                              padding: '2px 6px', 
                              backgroundColor: 'var(--color-bg-tertiary)', 
                              color: 'var(--color-text-secondary)',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}>
                              @{org.slug}
                            </span>
                          </div>
                          {org.description && (
                            <p style={{ 
                              margin: '4px 0 0 0', 
                              fontSize: '12px', 
                              color: 'var(--color-text-secondary)',
                              lineHeight: '1.4'
                            }}>
                              {org.description}
                            </p>
                          )}
                        </div>

                        {/* Status / Button */}
                        <div>
                          {hasPending ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              color: '#F59E0B',
                              fontSize: '12px',
                              fontWeight: 500
                            }}>
                              <Clock size={12} />
                              Pendente
                            </span>
                          ) : hasApproved ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              color: '#10B981',
                              fontSize: '12px',
                              fontWeight: 500
                            }}>
                              <Check size={12} />
                              Aprovado
                            </span>
                          ) : isAsking ? null : (
                            <button
                              onClick={() => setShowMsgInputForOrg(org.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--color-primary-teal)',
                                border: 'none',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              Pedir para entrar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Input de mensagem ao pedir para entrar */}
                      {isAsking && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          borderTop: '1px solid var(--color-border-primary)',
                          paddingTop: '10px',
                          marginTop: '4px'
                        }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <MessageSquare size={13} style={{ color: 'var(--color-text-muted)' }} />
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                              Mensagem para o administrador (opcional):
                            </span>
                          </div>
                          <input
                            type="text"
                            placeholder="Ex: Olá, sou do time de vendas..."
                            value={joinMessage}
                            onChange={e => setJoinMessage(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-border-primary)',
                              backgroundColor: 'var(--color-bg-card)',
                              color: 'var(--color-text-primary)',
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setShowMsgInputForOrg(null);
                                setJoinMessage('');
                              }}
                              disabled={joiningOrgId != null}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: '1px solid var(--color-border-primary)',
                                backgroundColor: 'transparent',
                                color: 'var(--color-text-secondary)',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => void handleRequestToJoin(org.id)}
                              disabled={joiningOrgId != null}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: 'var(--color-primary-teal)',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {joiningOrgId === org.id ? 'Enviando...' : 'Enviar Solicitação'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

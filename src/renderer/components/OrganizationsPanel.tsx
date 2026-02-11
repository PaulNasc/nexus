import React, { useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  Plus,
  Users,
  Mail,
  LogOut,
  Trash2,
  Crown,
  Shield,
  User,
  Check,
  X,
  Search,
  Copy,
  ChevronRight,
  Send,
  Clock,
  UserPlus,
} from 'lucide-react';

interface OrganizationsPanelProps {
  isDark: boolean;
}

type PanelView = 'list' | 'create' | 'details' | 'invite' | 'join' | 'myInvites';

export const OrganizationsPanel: React.FC<OrganizationsPanelProps> = ({ isDark }) => {
  const {
    organizations,
    activeOrg,
    members,
    invites,
    joinRequests,
    myInvites,
    myRole,
    loading,
    createOrganization,
    deleteOrganization,
    setActiveOrg,
    removeMember,
    updateMemberRole,
    leaveOrganization,
    inviteMember,
    cancelInvite,
    acceptInvite,
    declineInvite,
    requestToJoin,
    approveJoinRequest,
    rejectJoinRequest,
    searchOrgBySlug,
  } = useOrganization();

  const { user } = useAuth();

  const [view, setView] = useState<PanelView>('list');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [joinSlug, setJoinSlug] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [foundOrg, setFoundOrg] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
    border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${isDark ? '#333' : '#D1D5DB'}`,
    backgroundColor: isDark ? '#111' : '#FFF',
    color: isDark ? '#FFF' : '#111',
    fontSize: '14px',
    outline: 'none',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#00D4AA',
    color: '#000',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: `1px solid ${isDark ? '#333' : '#D1D5DB'}`,
    backgroundColor: 'transparent',
    color: isDark ? '#CCC' : '#374151',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const btnDanger: React.CSSProperties = {
    ...btnSecondary,
    borderColor: '#EF4444',
    color: '#EF4444',
  };

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown size={14} color="#F59E0B" />;
    if (role === 'admin') return <Shield size={14} color="#3B82F6" />;
    return <User size={14} color="#6B7280" />;
  };

  const roleLabel = (role: string) => {
    if (role === 'owner') return 'Proprietário';
    if (role === 'admin') return 'Admin';
    return 'Membro';
  };

  // === HANDLERS ===

  const handleCreate = async () => {
    if (!newOrgName.trim()) return;
    setActionLoading(true);
    try {
      const org = await createOrganization(newOrgName.trim(), newOrgDesc.trim());
      if (org) {
        showFeedback('success', `Organização "${org.name}" criada!`);
        setNewOrgName('');
        setNewOrgDesc('');
        setView('list');
      }
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Erro ao criar organização');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setActionLoading(true);
    const ok = await inviteMember(inviteEmail.trim(), inviteRole);
    setActionLoading(false);
    if (ok) {
      showFeedback('success', `Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
    } else {
      showFeedback('error', 'Erro ao enviar convite');
    }
  };

  const handleSearchOrg = async () => {
    if (!joinSlug.trim()) return;
    setActionLoading(true);
    const org = await searchOrgBySlug(joinSlug.trim());
    setActionLoading(false);
    if (org) {
      setFoundOrg(org);
    } else {
      showFeedback('error', 'Organização não encontrada');
      setFoundOrg(null);
    }
  };

  const handleRequestJoin = async () => {
    if (!foundOrg) return;
    setActionLoading(true);
    const ok = await requestToJoin(foundOrg.id, joinMessage.trim());
    setActionLoading(false);
    if (ok) {
      showFeedback('success', 'Pedido de entrada enviado!');
      setJoinSlug('');
      setJoinMessage('');
      setFoundOrg(null);
      setView('list');
    } else {
      showFeedback('error', 'Erro ao enviar pedido');
    }
  };

  const handleLeave = async (orgId: string) => {
    if (!confirm('Tem certeza que deseja sair desta organização?')) return;
    setActionLoading(true);
    const ok = await leaveOrganization(orgId);
    setActionLoading(false);
    if (ok) {
      showFeedback('success', 'Você saiu da organização');
      setView('list');
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('Tem certeza? Todos os dados da organização serão perdidos.')) return;
    setActionLoading(true);
    const ok = await deleteOrganization(orgId);
    setActionLoading(false);
    if (ok) {
      showFeedback('success', 'Organização excluída');
      setView('list');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showFeedback('success', 'Copiado!');
  };

  // === RENDER ===

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: isDark ? '#888' : '#9CA3AF' }}>
        Carregando organizações...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Feedback toast */}
      {feedback && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          backgroundColor: feedback.type === 'success' ? '#065F4620' : '#EF444420',
          color: feedback.type === 'success' ? '#10B981' : '#EF4444',
          fontSize: '13px',
          fontWeight: 500,
          border: `1px solid ${feedback.type === 'success' ? '#10B98140' : '#EF444440'}`,
        }}>
          {feedback.msg}
        </div>
      )}

      {/* === LIST VIEW === */}
      {view === 'list' && (
        <>
          {/* Active org indicator */}
          {activeOrg && (
            <div style={{
              ...cardStyle,
              borderColor: '#00D4AA40',
              backgroundColor: isDark ? '#0A1F1A' : '#F0FDF9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Organização Ativa
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: isDark ? '#FFF' : '#111' }}>
                    {activeOrg.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <code style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#00D4AA',
                      backgroundColor: isDark ? '#0A0A0A' : '#ECFDF5',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      userSelect: 'all' as const,
                    }}>
                      {activeOrg.slug}
                    </code>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(activeOrg.slug); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: isDark ? '#888' : '#6B7280' }}
                      title="Copiar ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={btnSecondary}
                    onClick={() => setView('details')}
                  >
                    <Users size={14} /> Gerenciar
                  </button>
                  <button
                    style={btnSecondary}
                    onClick={() => setActiveOrg(null)}
                  >
                    Pessoal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* My pending invites */}
          {myInvites.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFF' : '#111', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="#F59E0B" /> Convites Pendentes ({myInvites.length})
              </div>
              {myInvites.map(inv => (
                <div key={inv.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#111' : '#FFF',
                  marginBottom: '8px',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: isDark ? '#FFF' : '#111' }}>{inv.org_name || 'Organização'}</div>
                    <div style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280' }}>Cargo: {roleLabel(inv.role)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px' }}
                      onClick={async () => {
                        await acceptInvite(inv.id);
                        showFeedback('success', 'Convite aceito!');
                      }}
                    >
                      <Check size={14} /> Aceitar
                    </button>
                    <button
                      style={{ ...btnDanger, padding: '6px 12px', fontSize: '12px' }}
                      onClick={async () => {
                        await declineInvite(inv.id);
                        showFeedback('success', 'Convite recusado');
                      }}
                    >
                      <X size={14} /> Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Org list */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFF' : '#111' }}>
                Minhas Organizações ({organizations.length})
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...btnPrimary, padding: '8px 14px', fontSize: '13px' }} onClick={() => setView('create')}>
                  <Plus size={14} /> Criar
                </button>
                <button style={{ ...btnSecondary, padding: '8px 14px', fontSize: '13px' }} onClick={() => setView('join')}>
                  <UserPlus size={14} /> Entrar
                </button>
              </div>
            </div>

            {organizations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: isDark ? '#666' : '#9CA3AF' }}>
                <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>Nenhuma organização</div>
                <div style={{ fontSize: '12px' }}>Crie uma organização ou peça para entrar em uma existente.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => { if (activeOrg?.id !== org.id) setActiveOrg(org); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: activeOrg?.id === org.id
                        ? (isDark ? '#0A1F1A' : '#F0FDF9')
                        : (isDark ? '#111' : '#FFF'),
                      border: activeOrg?.id === org.id
                        ? '1px solid #00D4AA40'
                        : `1px solid ${isDark ? '#222' : '#E5E7EB'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      color: isDark ? '#FFF' : '#111',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 size={18} color={activeOrg?.id === org.id ? '#00D4AA' : (isDark ? '#666' : '#9CA3AF')} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>{org.name}</div>
                        <div style={{ fontSize: '11px', color: isDark ? '#666' : '#9CA3AF' }}>{org.slug}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color={isDark ? '#444' : '#D1D5DB'} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* === CREATE VIEW === */}
      {view === 'create' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button style={btnSecondary} onClick={() => setView('list')}>← Voltar</button>
            <span style={{ fontWeight: 600, color: isDark ? '#FFF' : '#111' }}>Criar Organização</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#CCC' : '#374151', marginBottom: '6px', display: 'block' }}>
                Nome da Organização *
              </label>
              <input
                style={inputStyle}
                placeholder="Ex: Minha Empresa"
                value={newOrgName}
                onChange={e => setNewOrgName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#CCC' : '#374151', marginBottom: '6px', display: 'block' }}>
                Descrição (opcional)
              </label>
              <input
                style={inputStyle}
                placeholder="Breve descrição..."
                value={newOrgDesc}
                onChange={e => setNewOrgDesc(e.target.value)}
              />
            </div>
            <button
              style={{ ...btnPrimary, justifyContent: 'center', opacity: actionLoading ? 0.6 : 1 }}
              onClick={handleCreate}
              disabled={actionLoading || !newOrgName.trim()}
            >
              <Plus size={16} /> {actionLoading ? 'Criando...' : 'Criar Organização'}
            </button>
          </div>
        </div>
      )}

      {/* === JOIN VIEW === */}
      {view === 'join' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button style={btnSecondary} onClick={() => { setView('list'); setFoundOrg(null); }}>← Voltar</button>
            <span style={{ fontWeight: 600, color: isDark ? '#FFF' : '#111' }}>Entrar em Organização</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#CCC' : '#374151', marginBottom: '6px', display: 'block' }}>
                ID da Organização (slug)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="ex: minha-empresa-a1b2"
                  value={joinSlug}
                  onChange={e => setJoinSlug(e.target.value)}
                  autoFocus
                />
                <button
                  style={{ ...btnPrimary, padding: '10px 16px' }}
                  onClick={handleSearchOrg}
                  disabled={actionLoading}
                >
                  <Search size={14} />
                </button>
              </div>
            </div>

            {foundOrg && (
              <div style={{
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: isDark ? '#111' : '#FFF',
                border: `1px solid ${isDark ? '#333' : '#D1D5DB'}`,
              }}>
                <div style={{ fontWeight: 600, color: isDark ? '#FFF' : '#111', marginBottom: '4px' }}>
                  {foundOrg.name}
                </div>
                <div style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', marginBottom: '12px' }}>
                  ID: {foundOrg.slug}
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#CCC' : '#374151', marginBottom: '6px', display: 'block' }}>
                    Mensagem (opcional)
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="Olá, gostaria de participar..."
                    value={joinMessage}
                    onChange={e => setJoinMessage(e.target.value)}
                  />
                </div>
                <button
                  style={{ ...btnPrimary, justifyContent: 'center', marginTop: '12px', width: '100%', opacity: actionLoading ? 0.6 : 1 }}
                  onClick={handleRequestJoin}
                  disabled={actionLoading}
                >
                  <Send size={14} /> {actionLoading ? 'Enviando...' : 'Pedir para Entrar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === DETAILS VIEW (manage active org) === */}
      {view === 'details' && activeOrg && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={btnSecondary} onClick={() => setView('list')}>← Voltar</button>
            <span style={{ fontWeight: 600, color: isDark ? '#FFF' : '#111' }}>{activeOrg.name}</span>
          </div>

          {/* Org info */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: isDark ? '#888' : '#6B7280', marginBottom: '4px' }}>ID da Organização</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <code style={{ fontSize: '13px', color: '#00D4AA', backgroundColor: isDark ? '#111' : '#F3F4F6', padding: '4px 8px', borderRadius: '4px' }}>
                    {activeOrg.slug}
                  </code>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    onClick={() => copyToClipboard(activeOrg.slug)}
                  >
                    <Copy size={14} color={isDark ? '#888' : '#6B7280'} />
                  </button>
                </div>
                {activeOrg.description && (
                  <div style={{ fontSize: '13px', color: isDark ? '#AAA' : '#4B5563', marginTop: '8px' }}>
                    {activeOrg.description}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {roleIcon(myRole || 'member')}
                <span style={{ fontSize: '12px', color: isDark ? '#AAA' : '#6B7280' }}>{roleLabel(myRole || 'member')}</span>
              </div>
            </div>
          </div>

          {/* Members */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFF' : '#111' }}>
                Membros ({members.length})
              </div>
              {(myRole === 'owner' || myRole === 'admin') && (
                <button style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px' }} onClick={() => setView('invite')}>
                  <Mail size={14} /> Convidar
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {members.map(m => (
                <div key={m.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#111' : '#FFF',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {roleIcon(m.role)}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '13px', color: isDark ? '#FFF' : '#111' }}>
                        {m.display_name || m.email}
                        {m.user_id === user?.id && <span style={{ color: '#00D4AA', fontSize: '11px', marginLeft: '6px' }}>(você)</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: isDark ? '#666' : '#9CA3AF' }}>{m.email}</div>
                    </div>
                  </div>

                  {(myRole === 'owner' || myRole === 'admin') && m.user_id !== user?.id && m.role !== 'owner' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {myRole === 'owner' && (
                        <select
                          value={m.role}
                          onChange={async (e) => {
                            await updateMemberRole(m.id, e.target.value as 'admin' | 'member');
                            showFeedback('success', 'Cargo atualizado');
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${isDark ? '#333' : '#D1D5DB'}`,
                            backgroundColor: isDark ? '#1A1A1A' : '#FFF',
                            color: isDark ? '#CCC' : '#374151',
                            fontSize: '12px',
                          }}
                        >
                          <option value="member">Membro</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        onClick={async () => {
                          if (confirm(`Remover ${m.display_name || m.email}?`)) {
                            await removeMember(m.id);
                            showFeedback('success', 'Membro removido');
                          }
                        }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending invites (admin/owner only) */}
          {(myRole === 'owner' || myRole === 'admin') && invites.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFF' : '#111', marginBottom: '12px' }}>
                Convites Pendentes ({invites.length})
              </div>
              {invites.map(inv => (
                <div key={inv.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#111' : '#FFF',
                  marginBottom: '6px',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', color: isDark ? '#FFF' : '#111' }}>{inv.invited_email}</div>
                    <div style={{ fontSize: '11px', color: isDark ? '#666' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} /> Expira em {new Date(inv.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px' }}
                    onClick={async () => {
                      await cancelInvite(inv.id);
                      showFeedback('success', 'Convite cancelado');
                    }}
                  >
                    <X size={12} /> Cancelar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Join requests (admin/owner only) */}
          {(myRole === 'owner' || myRole === 'admin') && joinRequests.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFF' : '#111', marginBottom: '12px' }}>
                Pedidos de Entrada ({joinRequests.length})
              </div>
              {joinRequests.map(req => (
                <div key={req.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#111' : '#FFF',
                  marginBottom: '6px',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#FFF' : '#111' }}>
                      {req.user_display_name || req.user_email}
                    </div>
                    {req.message && (
                      <div style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', fontStyle: 'italic' }}>
                        "{req.message}"
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      style={{ ...btnPrimary, padding: '6px 10px', fontSize: '11px' }}
                      onClick={async () => {
                        await approveJoinRequest(req.id);
                        showFeedback('success', 'Pedido aprovado');
                      }}
                    >
                      <Check size={12} /> Aprovar
                    </button>
                    <button
                      style={{ ...btnDanger, padding: '6px 10px', fontSize: '11px' }}
                      onClick={async () => {
                        await rejectJoinRequest(req.id);
                        showFeedback('success', 'Pedido rejeitado');
                      }}
                    >
                      <X size={12} /> Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {myRole !== 'owner' && (
              <button style={btnDanger} onClick={() => handleLeave(activeOrg.id)}>
                <LogOut size={14} /> Sair da Organização
              </button>
            )}
            {myRole === 'owner' && (
              <button style={btnDanger} onClick={() => handleDelete(activeOrg.id)}>
                <Trash2 size={14} /> Excluir Organização
              </button>
            )}
          </div>
        </div>
      )}

      {/* === INVITE VIEW === */}
      {view === 'invite' && activeOrg && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button style={btnSecondary} onClick={() => setView('details')}>← Voltar</button>
            <span style={{ fontWeight: 600, color: isDark ? '#FFF' : '#111' }}>Convidar para {activeOrg.name}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#CCC' : '#374151', marginBottom: '6px', display: 'block' }}>
                Email do Convidado *
              </label>
              <input
                style={inputStyle}
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#CCC' : '#374151', marginBottom: '6px', display: 'block' }}>
                Cargo
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                }}
              >
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              style={{ ...btnPrimary, justifyContent: 'center', opacity: actionLoading ? 0.6 : 1 }}
              onClick={handleInvite}
              disabled={actionLoading || !inviteEmail.trim()}
            >
              <Send size={14} /> {actionLoading ? 'Enviando...' : 'Enviar Convite'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

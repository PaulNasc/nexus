import React, { useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSystemTags } from '../contexts/SystemTagsContext';
import {
  Building2,
  Plus,
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
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  UserPlus,
  Pencil,
  Flag,
} from 'lucide-react';

interface OrganizationsPanelProps {
  isDark: boolean;
}

type PanelView = 'list' | 'create' | 'invite' | 'join';

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
  const { tags: systemTags, createTag, updateTag, deactivateTag } = useSystemTags();

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

  const [membersCollapsed, setMembersCollapsed] = useState(false);
  const [systemTagsCollapsed, setSystemTagsCollapsed] = useState(false);
  const [editingSystemTagId, setEditingSystemTagId] = useState<number | null>(null);
  const [systemTagName, setSystemTagName] = useState('');
  const [systemTagColor, setSystemTagColor] = useState('#00D4AA');
  const [showSystemTagForm, setShowSystemTagForm] = useState(false);

  const catColorOptions = [
    { value: '#00D4AA', label: 'Teal' },
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Amarelo' },
    { value: '#EF4444', label: 'Vermelho' },
    { value: '#7B3FF2', label: 'Roxo' },
    { value: '#8B5CF6', label: 'Violeta' },
    { value: '#F97316', label: 'Laranja' },
    { value: '#EC4899', label: 'Rosa' },
    { value: '#06B6D4', label: 'Ciano' },
    { value: '#84CC16', label: 'Lima' },
    { value: '#F43F5E', label: 'Vermelho Rosado' },
    { value: '#14B8A6', label: 'Turquesa' },
    { value: '#A855F7', label: 'Púrpura' },
    { value: '#FBBF24', label: 'Amarelo Ouro' },
    { value: '#FB923C', label: 'Laranja Claro' },
    { value: '#F87171', label: 'Vermelho Claro' },
    { value: '#34D399', label: 'Verde Esmeralda' },
    { value: '#60A5FA', label: 'Azul Céu' },
    { value: '#A78BFA', label: 'Roxo Lavanda' },
    { value: '#F472B6', label: 'Rosa Magenta' },
    { value: '#FCD34D', label: 'Amarelo Limão' },
  ];
  const activeSystemTags = systemTags.filter((tag) => tag.is_active);

  const handleEditSystemTag = (tag: { id: number; name: string; color: string }) => {
    setEditingSystemTagId(tag.id);
    setSystemTagName(tag.name);
    setSystemTagColor(tag.color);
    setShowSystemTagForm(true);
  };

  const handleSaveSystemTag = async () => {
    if (!systemTagName.trim()) return;
    setActionLoading(true);
    try {
      const ok = editingSystemTagId
        ? await updateTag(editingSystemTagId, { name: systemTagName.trim(), color: systemTagColor })
        : await createTag(systemTagName.trim(), systemTagColor);

      if (ok) {
        showFeedback('success', editingSystemTagId ? 'Tag de sistema atualizada' : 'Tag de sistema criada');
        setEditingSystemTagId(null);
        setSystemTagName('');
        setSystemTagColor('#00D4AA');
        setShowSystemTagForm(false);
      } else {
        showFeedback('error', 'Falha ao salvar tag de sistema');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateSystemTag = async (id: number) => {
    if (!confirm('Desativar esta tag de sistema?')) return;
    setActionLoading(true);
    try {
      const ok = await deactivateTag(id);
      if (ok) showFeedback('success', 'Tag de sistema desativada');
      else showFeedback('error', 'Falha ao desativar tag de sistema');
    } finally {
      setActionLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const executeBooleanAction = async (
    action: () => Promise<boolean>,
    successMsg: string,
    errorMsg: string,
    onSuccess?: () => void,
  ): Promise<boolean> => {
    setActionLoading(true);
    try {
      const ok = await action();
      if (ok) {
        showFeedback('success', successMsg);
        onSuccess?.();
        return true;
      }
      showFeedback('error', errorMsg);
      return false;
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : errorMsg);
      return false;
    } finally {
      setActionLoading(false);
    }
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
    const email = inviteEmail.trim();
    await executeBooleanAction(
      () => inviteMember(email, inviteRole),
      `Convite enviado para ${email}`,
      'Erro ao enviar convite',
      () => setInviteEmail(''),
    );
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
    await executeBooleanAction(
      () => requestToJoin(foundOrg.id, joinMessage.trim()),
      'Pedido de entrada enviado!',
      'Erro ao enviar pedido',
      () => {
        setJoinSlug('');
        setJoinMessage('');
        setFoundOrg(null);
        setView('list');
      },
    );
  };

  const handleLeave = async (orgId: string) => {
    if (!confirm('Tem certeza que deseja sair desta organização?')) return;
    await executeBooleanAction(
      () => leaveOrganization(orgId),
      'Você saiu da organização',
      'Erro ao sair da organização',
      () => setView('list'),
    );
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('Tem certeza? Todos os dados da organização serão perdidos.')) return;
    await executeBooleanAction(
      () => deleteOrganization(orgId),
      'Organização excluída',
      'Erro ao excluir organização',
      () => setView('list'),
    );
  };

  const handleAcceptInviteAction = async (inviteId: string) => {
    await executeBooleanAction(
      () => acceptInvite(inviteId),
      'Convite aceito!',
      'Erro ao aceitar convite',
    );
  };

  const handleDeclineInviteAction = async (inviteId: string) => {
    await executeBooleanAction(
      () => declineInvite(inviteId),
      'Convite recusado',
      'Erro ao recusar convite',
    );
  };

  const handleCancelInviteAction = async (inviteId: string) => {
    await executeBooleanAction(
      () => cancelInvite(inviteId),
      'Convite cancelado',
      'Erro ao cancelar convite',
    );
  };

  const handleApproveJoinRequestAction = async (requestId: string) => {
    await executeBooleanAction(
      () => approveJoinRequest(requestId),
      'Pedido aprovado',
      'Erro ao aprovar pedido',
    );
  };

  const handleRejectJoinRequestAction = async (requestId: string) => {
    await executeBooleanAction(
      () => rejectJoinRequest(requestId),
      'Pedido rejeitado',
      'Erro ao rejeitar pedido',
    );
  };

  const handleUpdateMemberRoleAction = async (memberId: number, role: 'admin' | 'member') => {
    await executeBooleanAction(
      () => updateMemberRole(memberId, role),
      'Cargo atualizado',
      'Erro ao atualizar cargo',
    );
  };

  const handleRemoveMemberAction = async (memberId: number, memberLabel: string) => {
    if (!confirm(`Remover ${memberLabel}?`)) return;
    await executeBooleanAction(
      () => removeMember(memberId),
      'Membro removido',
      'Erro ao remover membro',
    );
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
          {/* Active Org Banner Card */}
          <div style={{
            ...cardStyle,
            borderColor: activeOrg ? '#00D4AA40' : (isDark ? '#333' : '#E5E7EB'),
            backgroundColor: activeOrg ? (isDark ? '#0A1F1A' : '#F0FDF9') : cardStyle.backgroundColor,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: activeOrg ? '#00D4AA' : (isDark ? '#888' : '#6B7280'), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  {activeOrg ? 'Organização Ativa' : 'Modo Pessoal (Local)'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#FFF' : '#111', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {activeOrg ? activeOrg.name : 'Armazenamento Local'}
                  {activeOrg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: isDark ? '#111' : '#E5E7EB', padding: '2px 8px', borderRadius: '12px' }}>
                      {roleIcon(myRole || 'member')}
                      <span style={{ fontSize: '11px', color: isDark ? '#CCC' : '#374151', fontWeight: 500 }}>{roleLabel(myRole || 'member')}</span>
                    </div>
                  )}
                </div>
                {activeOrg ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280' }}>ID da Organização:</span>
                    <code style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#00D4AA',
                      backgroundColor: isDark ? '#0A0A0A' : '#ECFDF5',
                      padding: '3px 8px',
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
                ) : (
                  <div style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', marginTop: '4px' }}>
                    Suas notas e tarefas estão salvas exclusivamente no computador neste modo.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={{ ...btnPrimary, padding: '7px 14px', fontSize: '12px' }} onClick={() => setView('create')}>
                  <Plus size={14} /> Criar
                </button>
                <button style={{ ...btnSecondary, padding: '7px 14px', fontSize: '12px' }} onClick={() => setView('join')}>
                  <UserPlus size={14} /> Entrar
                </button>
                {activeOrg && (myRole === 'owner' || myRole === 'admin') && (
                  <button style={{ ...btnSecondary, padding: '7px 14px', fontSize: '12px' }} onClick={() => setView('invite')}>
                    <Mail size={14} /> Convidar
                  </button>
                )}
                {activeOrg && (
                  <button style={{ ...btnSecondary, padding: '7px 14px', fontSize: '12px' }} onClick={() => setActiveOrg(null)}>
                    Modo Pessoal
                  </button>
                )}
              </div>
            </div>
          </div>

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
                      style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px', opacity: actionLoading ? 0.6 : 1 }}
                      onClick={() => void handleAcceptInviteAction(inv.id)}
                      disabled={actionLoading}
                    >
                      <Check size={14} /> Aceitar
                    </button>
                    <button
                      style={{ ...btnDanger, padding: '6px 12px', fontSize: '12px', opacity: actionLoading ? 0.6 : 1 }}
                      onClick={() => void handleDeclineInviteAction(inv.id)}
                      disabled={actionLoading}
                    >
                      <X size={14} /> Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Org Selector Card */}
          <div style={cardStyle}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFF' : '#111', marginBottom: '12px' }}>
              Minhas Organizações ({organizations.length})
            </div>

            {organizations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: isDark ? '#666' : '#9CA3AF' }}>
                <Building2 size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: '13px' }}>Você ainda não faz parte de nenhuma organização na nuvem.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {organizations.map(org => {
                  const isActive = activeOrg?.id === org.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => { if (!isActive) setActiveOrg(org); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: isActive
                          ? (isDark ? '#0A1F1A' : '#F0FDF9')
                          : (isDark ? '#111' : '#FFF'),
                        border: isActive
                          ? '1px solid #00D4AA'
                          : `1px solid ${isDark ? '#222' : '#E5E7EB'}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: isDark ? '#FFF' : '#111',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <Building2 size={18} color={isActive ? '#00D4AA' : (isDark ? '#666' : '#9CA3AF')} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.name}</div>
                          <div style={{ fontSize: '11px', color: isDark ? '#666' : '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.slug}</div>
                        </div>
                      </div>
                      {isActive && <Check size={16} color="#00D4AA" />}
                    </button>
                  );
                })}
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

      {/* === ACTIVE ORG DETAILS & MEMBERS === */}
      {view === 'list' && activeOrg && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Members */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFF' : '#111', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Membros ({members.length})
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#AAA' : '#6B7280', display: 'flex', alignItems: 'center' }}
                  onClick={() => setMembersCollapsed((prev) => !prev)}
                  title={membersCollapsed ? 'Expandir membros' : 'Recolher membros'}
                >
                  {membersCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
              {(myRole === 'owner' || myRole === 'admin') && (
                <button style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px' }} onClick={() => setView('invite')}>
                  <Mail size={14} /> Convidar
                </button>
              )}
            </div>

            {!membersCollapsed && (
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
                          onChange={(e) => {
                            void handleUpdateMemberRoleAction(m.id, e.target.value as 'admin' | 'member');
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${isDark ? '#333' : '#D1D5DB'}`,
                            backgroundColor: isDark ? '#1A1A1A' : '#FFF',
                            color: isDark ? '#CCC' : '#374151',
                            fontSize: '12px',
                          }}
                          disabled={actionLoading}
                        >
                          <option value="member">Membro</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        onClick={() => void handleRemoveMemberAction(m.id, m.display_name || m.email || 'membro')}
                        disabled={actionLoading}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              </div>
            )}
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
                    style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px', opacity: actionLoading ? 0.6 : 1 }}
                    onClick={() => void handleCancelInviteAction(inv.id)}
                    disabled={actionLoading}
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
                      style={{ ...btnPrimary, padding: '6px 10px', fontSize: '11px', opacity: actionLoading ? 0.6 : 1 }}
                      onClick={() => void handleApproveJoinRequestAction(req.id)}
                      disabled={actionLoading}
                    >
                      <Check size={12} /> Aprovar
                    </button>
                    <button
                      style={{ ...btnDanger, padding: '6px 10px', fontSize: '11px', opacity: actionLoading ? 0.6 : 1 }}
                      onClick={() => void handleRejectJoinRequestAction(req.id)}
                      disabled={actionLoading}
                    >
                      <X size={12} /> Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(myRole === 'owner' || myRole === 'admin') && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFF' : '#111', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flag size={16} color="#00D4AA" /> Tags de Sistema ({activeSystemTags.length})
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#AAA' : '#6B7280', display: 'flex', alignItems: 'center' }}
                    onClick={() => setSystemTagsCollapsed((prev) => !prev)}
                    title={systemTagsCollapsed ? 'Expandir tags de sistema' : 'Recolher tags de sistema'}
                  >
                    {systemTagsCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
                <button
                  style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => { setShowSystemTagForm(true); setEditingSystemTagId(null); setSystemTagName(''); setSystemTagColor('#00D4AA'); }}
                >
                  <Plus size={14} /> Nova
                </button>
              </div>

              {!systemTagsCollapsed && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: showSystemTagForm ? '14px' : '0' }}>
                    {activeSystemTags.length === 0 && !showSystemTagForm && (
                      <div style={{ textAlign: 'center', padding: '16px', color: isDark ? '#666' : '#9CA3AF', fontSize: '13px' }}>
                        Nenhuma tag de sistema criada.
                      </div>
                    )}

                    {activeSystemTags.map((tag) => (
                      <div
                        key={tag.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', backgroundColor: isDark ? '#111' : '#FFF' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: tag.color, flexShrink: 0 }} />
                          <div style={{ fontWeight: 500, fontSize: '13px', color: isDark ? '#FFF' : '#111' }}>{tag.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={() => handleEditSystemTag(tag)} title="Editar">
                            <Pencil size={14} color={isDark ? '#888' : '#6B7280'} />
                          </button>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={() => handleDeactivateSystemTag(tag.id)} title="Desativar">
                            <Trash2 size={14} color="#EF4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showSystemTagForm && (
                    <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: isDark ? '#111' : '#FFF', border: `1px solid ${isDark ? '#333' : '#D1D5DB'}` }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#FFF' : '#111', marginBottom: '12px' }}>
                        {editingSystemTagId ? 'Editar Tag de Sistema' : 'Nova Tag de Sistema'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input style={inputStyle} placeholder="Nome da tag" value={systemTagName} onChange={(e) => setSystemTagName(e.target.value)} autoFocus />
                        <div>
                          <label style={{ fontSize: '12px', color: isDark ? '#AAA' : '#6B7280', marginBottom: '6px', display: 'block' }}>Cor</label>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {catColorOptions.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setSystemTagColor(opt.value)}
                                title={opt.label}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: opt.value,
                                  border: systemTagColor === opt.value ? '2px solid #FFF' : '2px solid transparent',
                                  cursor: 'pointer',
                                  boxShadow: systemTagColor === opt.value ? `0 0 0 2px ${opt.value}` : 'none',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button style={btnSecondary} onClick={() => { setShowSystemTagForm(false); setEditingSystemTagId(null); setSystemTagName(''); }}>
                            Cancelar
                          </button>
                          <button style={{ ...btnPrimary, padding: '8px 16px', fontSize: '13px', opacity: actionLoading || !systemTagName.trim() ? 0.6 : 1 }} onClick={handleSaveSystemTag} disabled={actionLoading || !systemTagName.trim()}>
                            <Check size={14} /> {editingSystemTagId ? 'Salvar' : 'Criar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
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
            <button style={btnSecondary} onClick={() => setView('list')}>← Voltar</button>
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

import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight, Check, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { Note } from '../../shared/types/note';

export interface PingUser {
  id: string;
  name: string;
  email?: string;
}

interface PingUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onSendPings: (targetUsers: PingUser[]) => void;
}

export const PingUserModal: React.FC<PingUserModalProps> = ({
  isOpen,
  onClose,
  note,
  onSendPings,
}) => {
  const { members } = useOrganization();
  const { user: currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState<PingUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, PingUser>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedUsers(new Map());
      return;
    }

    const loadUsers = async () => {
      setLoading(true);
      try {
        const loadedMap = new Map<string, PingUser>();

        // 1. Load active org members
        if (members && members.length > 0) {
          for (const m of members) {
            if (m.user_id && m.user_id !== currentUser?.id) {
              const displayName = m.display_name || m.email || 'Membro da Organização';
              loadedMap.set(m.user_id, {
                id: m.user_id,
                name: displayName,
                email: m.email,
              });
            }
          }
        }

        // 2. Query profiles from Supabase for other active users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .limit(50);

        if (profiles) {
          for (const p of profiles) {
            if (p.id && p.id !== currentUser?.id && !loadedMap.has(p.id)) {
              loadedMap.set(p.id, {
                id: p.id,
                name: p.display_name || 'Usuário Nexus',
              });
            }
          }
        }

        setUsersList(Array.from(loadedMap.values()));
      } catch (err) {
        console.warn('Failed to load users for ping modal:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [isOpen, members, currentUser]);

  if (!isOpen || !note) return null;

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  const toggleUser = (u: PingUser) => {
    setSelectedUsers(prev => {
      const next = new Map(prev);
      if (next.has(u.id)) {
        next.delete(u.id);
      } else {
        next.set(u.id, u);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUsers(new Map());
    } else {
      const next = new Map<string, PingUser>();
      filteredUsers.forEach(u => next.set(u.id, u));
      setSelectedUsers(next);
    }
  };

  const handleSend = () => {
    const targets = Array.from(selectedUsers.values());
    if (targets.length === 0) return;
    onSendPings(targets);
    onClose();
  };

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const isAllSelected = filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: isDark ? '#121212' : '#FFFFFF',
          border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
          borderRadius: '12px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: isDark ? '#FFFFFF' : 'var(--color-text-primary)',
              }}
            >
              Enviar Ping de Notificação
            </h3>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
              }}
            >
              Nota #{note.sequential_id || note.id}: {note.title || 'Sem título'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Select All */}
        <div style={{ padding: '12px 16px 8px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: isDark ? '#0A0A0A' : 'var(--color-bg-secondary)',
              border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
              borderRadius: '8px',
            }}
          >
            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuário por nome..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: isDark ? '#FFFFFF' : 'var(--color-text-primary)',
                fontSize: '13px',
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {filteredUsers.length > 0 && (
            <div
              onClick={toggleSelectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--color-primary-teal)',
                fontWeight: 500,
                userSelect: 'none',
              }}
            >
              <span>{isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}</span>
              <span>{selectedUsers.size} de {filteredUsers.length} selecionados</span>
            </div>
          )}
        </div>

        {/* User List */}
        <div
          style={{
            maxHeight: '230px',
            overflowY: 'auto',
            padding: '0 16px 8px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Carregando usuários...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {searchQuery ? 'Nenhum usuário encontrado.' : 'Nenhum outro usuário cadastrado.'}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUsers.has(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected
                      ? 'rgba(0, 212, 170, 0.12)'
                      : isDark ? '#1A1A1A' : 'var(--color-bg-secondary)',
                    border: `1px solid ${isSelected ? 'var(--color-primary-teal)' : isDark ? '#2A2A2A' : 'transparent'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary-teal)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '13px',
                      }}
                    >
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#FFFFFF' : 'var(--color-text-primary)' }}>
                        {u.name}
                      </div>
                      {u.email && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {u.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary-teal)' : 'var(--color-text-muted)'}`,
                      backgroundColor: isSelected ? 'var(--color-primary-teal)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Send Button & Seta */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
              borderRadius: '6px',
              color: isDark ? '#A0A0A0' : 'var(--color-text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={selectedUsers.size === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary-teal)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: selectedUsers.size === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedUsers.size === 0 ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <span>Enviar Ping {selectedUsers.size > 0 ? `(${selectedUsers.size})` : ''}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

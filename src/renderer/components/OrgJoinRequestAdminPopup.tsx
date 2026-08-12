import React, { useState } from 'react';
import { ShieldAlert, Check, X, UserCheck, Building2 } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

export const OrgJoinRequestAdminPopup: React.FC = () => {
  const { activeOrg, myRole, joinRequests, approveJoinRequest, rejectJoinRequest } = useOrganization();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Show only for admins and master (owner)
  const isAdminOrOwner = myRole === 'owner' || myRole === 'admin';
  const pendingRequests = (joinRequests || []).filter((req) => req.status === 'pending');

  if (!isAdminOrOwner || !activeOrg || pendingRequests.length === 0) {
    return null;
  }

  const currentReq = pendingRequests[0];
  const reqProfiles = (currentReq as any).profiles;
  const candidateName = reqProfiles?.display_name || reqProfiles?.email || 'Novo Usuário';
  const candidateEmail = reqProfiles?.email || '';

  const handleApprove = async () => {
    setProcessingId(currentReq.id);
    try {
      await approveJoinRequest(currentReq.id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    setProcessingId(currentReq.id);
    try {
      await rejectJoinRequest(currentReq.id);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        width: '380px',
        borderRadius: '16px',
        backgroundColor: 'var(--bg-primary, #0F0F14)',
        border: '2px solid rgba(245, 158, 11, 0.6)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.2)',
        padding: '18px',
        animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Admin/Master Header Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {myRole === 'owner' ? '👑 PAINEL MASTER' : '🛡️ PAINEL ADMIN'}
            </span>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #fff)', margin: 0 }}>
              Solicitação de Entrada
            </h4>
          </div>
        </div>

        {pendingRequests.length > 1 && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            +{pendingRequests.length - 1} pendente{pendingRequests.length > 2 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content Info */}
      <div
        style={{
          background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={16} style={{ color: '#14b8a6', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
            {candidateName}
          </span>
        </div>

        {candidateEmail && candidateEmail !== candidateName && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginLeft: '24px' }}>
            {candidateEmail}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '11px', color: '#f59e0b', fontWeight: 500 }}>
          <Building2 size={12} />
          <span>Solicita acesso à organização <strong>{activeOrg.name}</strong></span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleReject}
          disabled={processingId === currentReq.id}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '12px',
            fontWeight: 700,
            cursor: processingId === currentReq.id ? 'not-allowed' : 'pointer',
            opacity: processingId === currentReq.id ? 0.6 : 1,
            transition: 'all 0.12s ease',
          }}
        >
          <X size={15} /> Recusar
        </button>

        <button
          onClick={handleApprove}
          disabled={processingId === currentReq.id}
          style={{
            flex: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '9px 14px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: processingId === currentReq.id ? 'not-allowed' : 'pointer',
            opacity: processingId === currentReq.id ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
            transition: 'all 0.12s ease',
          }}
        >
          <Check size={15} /> Aprovar Entrada
        </button>
      </div>
    </div>
  );
};

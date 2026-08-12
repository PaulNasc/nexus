import React from 'react';
import { NoteViewerModal } from '../NoteViewerModal';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import type { Note } from '../../../shared/types/note';

interface ZenNoteViewerProps {
  note: Note;
  onEdit: () => void;
  onTogglePin: (note: Note) => void;
  onDelete: (note: Note) => void;
  onOpenPingModal: (note: Note) => void;
}

export const ZenNoteViewer: React.FC<ZenNoteViewerProps> = ({
  note,
  onEdit,
  onTogglePin,
  onDelete,
  onOpenPingModal,
}) => {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();

  return (
    <NoteViewerModal
      isOpen={true}
      note={note}
      onClose={() => {}}
      isEmbedded={true}
      onTogglePin={onTogglePin}
      onEditNote={onEdit}
      onDeleteNote={onDelete}
      onOpenPingModal={onOpenPingModal}
      ownerId={user?.id}
      orgId={activeOrg?.id}
    />
  );
};

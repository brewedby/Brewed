import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDocuments } from '@/lib/queries/documents';
import { useUploadDocument, useDeleteDocument } from '@/lib/mutations/documents';
import { useTheme } from '@/lib/themeContext';
import type { EventDocument } from '@/types';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mimeType: string | null): React.ComponentProps<typeof Ionicons>['name'] {
  if (!mimeType) return 'document-outline';
  if (mimeType === 'application/pdf') return 'document-text-outline';
  if (mimeType.startsWith('image/')) return 'image-outline';
  return 'document-outline';
}

interface DocumentRowProps {
  doc: EventDocument;
  onDelete: () => void;
  deleting: boolean;
}

function DocumentRow({ doc, onDelete, deleting }: DocumentRowProps) {
  const { tokens } = useTheme();
  const p = tokens.palette;

  function handleDelete() {
    Alert.alert(
      'Remove document',
      `Remove "${doc.file_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onDelete },
      ]
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: p.border, borderStyle: 'dashed' }}>
      <Ionicons name={mimeIcon(doc.mime_type)} size={18} color={p.textFaint} />
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={{ fontSize: 14, color: p.text, fontWeight: '500' }} numberOfLines={1}>
          {doc.file_name}
        </Text>
        {doc.file_size && (
          <Text style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>{formatFileSize(doc.file_size)}</Text>
        )}
      </View>
      {deleting ? (
        <ActivityIndicator size="small" color={p.textFaint} />
      ) : (
        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Remove ${doc.file_name}`}
        >
          <Ionicons name="close-circle-outline" size={20} color={p.textFaint} />
        </TouchableOpacity>
      )}
    </View>
  );
}

interface Props {
  eventId: string;
}

export function DocumentsSection({ eventId }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { data: docs, isLoading } = useDocuments(eventId);
  const { mutate: upload, isPending: uploading } = useUploadDocument(eventId);
  const { mutate: deleteDoc, isPending: deleting, variables: deletingVars } = useDeleteDocument();

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text }}>Documents</Text>
        <TouchableOpacity
          onPress={() => upload()}
          disabled={uploading}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          accessibilityLabel="Add document"
        >
          {uploading ? (
            <ActivityIndicator size="small" color={p.brand} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={18} color={p.brand} />
              <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={p.textMuted} />
      ) : !docs || docs.length === 0 ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <Ionicons name="folder-open-outline" size={28} color={p.textFaint} />
          <Text style={{ fontSize: 13, color: p.textMuted, marginTop: 8, textAlign: 'center' }}>
            No documents yet — add insurance, permits, or risk assessments
          </Text>
        </View>
      ) : (
        docs.map((doc) => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            deleting={deleting && deletingVars?.documentId === doc.id}
            onDelete={() => deleteDoc({ documentId: doc.id, storagePath: doc.storage_path, eventId })}
          />
        ))
      )}
    </View>
  );
}

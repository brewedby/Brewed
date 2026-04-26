import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDocuments } from '@/lib/queries/documents';
import { useUploadDocument, useDeleteDocument } from '@/lib/mutations/documents';
import type { EventDocument } from '@/types';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mimeType: string | null): string {
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
    <View className="flex-row items-center py-2.5 border-b border-stone-50">
      <Ionicons name={mimeIcon(doc.mime_type) as React.ComponentProps<typeof Ionicons>["name"]} size={20} color="#a8a29e" />
      <View className="flex-1 mx-3">
        <Text className="text-stone-800 text-sm font-medium" numberOfLines={1}>
          {doc.file_name}
        </Text>
        {doc.file_size && (
          <Text className="text-stone-400 text-xs mt-0.5">{formatFileSize(doc.file_size)}</Text>
        )}
      </View>
      {deleting ? (
        <ActivityIndicator size="small" color="#a8a29e" />
      ) : (
        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Remove ${doc.file_name}`}
        >
          <Ionicons name="close-circle-outline" size={20} color="#a8a29e" />
        </TouchableOpacity>
      )}
    </View>
  );
}

interface Props {
  eventId: string;
}

export function DocumentsSection({ eventId }: Props) {
  const { data: docs, isLoading } = useDocuments(eventId);
  const { mutate: upload, isPending: uploading } = useUploadDocument(eventId);
  const { mutate: deleteDoc, isPending: deleting, variables: deletingVars } = useDeleteDocument();

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-bold text-stone-900 text-base">Documents</Text>
        <TouchableOpacity
          onPress={() => upload()}
          disabled={uploading}
          className="flex-row items-center gap-1"
          accessibilityLabel="Add document"
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#b45309" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={18} color="#b45309" />
              <Text className="text-amber-700 text-sm font-medium">Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#a8a29e" />
      ) : !docs || docs.length === 0 ? (
        <View className="py-4 items-center">
          <Ionicons name="folder-open-outline" size={28} color="#d6d3d1" />
          <Text className="text-stone-400 text-sm mt-2">
            No documents yet — add insurance, permits, or risk assessments
          </Text>
        </View>
      ) : (
        docs.map((doc) => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            deleting={deleting && deletingVars?.documentId === doc.id}
            onDelete={() =>
              deleteDoc({
                documentId: doc.id,
                storagePath: doc.storage_path,
                eventId,
              })
            }
          />
        ))
      )}
    </View>
  );
}

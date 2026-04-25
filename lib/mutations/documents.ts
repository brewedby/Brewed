import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export function useUploadDocument(eventId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      const fileName = asset.name;
      const storagePath = `${user.id}/${eventId}/${Date.now()}-${fileName}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('event-documents')
        .upload(storagePath, blob, {
          contentType: asset.mimeType ?? 'application/octet-stream',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('event_documents').insert({
        event_id: eventId,
        user_id: user.id,
        file_name: fileName,
        file_size: asset.size ?? null,
        mime_type: asset.mimeType ?? null,
        storage_path: storagePath,
      });
      if (insertError) {
        await supabase.storage.from('event-documents').remove([storagePath]);
        throw insertError;
      }

      return storagePath;
    },
    onSuccess: (path) => {
      if (path !== null) {
        qc.invalidateQueries({ queryKey: ['documents', eventId] });
      }
    },
    onError: (err: Error) => {
      Alert.alert('Upload failed', err.message);
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, storagePath, eventId }: {
      documentId: string;
      storagePath: string;
      eventId: string;
    }) => {
      const { error: storageError } = await supabase.storage
        .from('event-documents')
        .remove([storagePath]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('event_documents')
        .delete()
        .eq('id', documentId);
      if (dbError) throw dbError;

      return eventId;
    },
    onSuccess: (eventId) => {
      qc.invalidateQueries({ queryKey: ['documents', eventId] });
    },
    onError: (err: Error) => {
      Alert.alert('Delete failed', err.message);
    },
  });
}

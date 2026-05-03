import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useTheme } from '@/lib/themeContext';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, onConfirm, onCancel,
}: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onCancel}>
        <Pressable>
          <View style={{ backgroundColor: p.surface, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, borderTopWidth: 2, borderTopColor: p.text }}>
            <View style={{ width: 40, height: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontFamily: tokens.type.display, fontSize: 20, color: p.text, marginBottom: 8 }}>{title}</Text>
            <Text style={{ fontSize: 14, color: p.textMuted, marginBottom: 24, lineHeight: 20 }}>{message}</Text>
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={onConfirm}
                style={{
                  paddingVertical: 16, alignItems: 'center',
                  backgroundColor: destructive ? '#dc2626' : p.text,
                }}
              >
                <Text style={{ color: p.bg, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>{confirmLabel.toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onCancel}
                style={{ paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: p.border }}
              >
                <Text style={{ color: p.textMuted, fontWeight: '600', fontSize: 14 }}>{cancelLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

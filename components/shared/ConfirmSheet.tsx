import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';

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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onCancel}>
        <Pressable>
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <View className="w-12 h-1 bg-stone-300 rounded-full self-center mb-6" />
            <Text className="text-lg font-bold text-stone-900 mb-2">{title}</Text>
            <Text className="text-stone-600 mb-6">{message}</Text>
            <View className="gap-3">
              <TouchableOpacity
                className={`py-4 rounded-xl items-center ${destructive ? 'bg-red-600' : 'bg-amber-700'}`}
                onPress={onConfirm}
              >
                <Text className="text-white font-semibold">{confirmLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-4 rounded-xl items-center bg-stone-100"
                onPress={onCancel}
              >
                <Text className="text-stone-700 font-semibold">{cancelLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

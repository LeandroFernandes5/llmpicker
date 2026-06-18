import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Attachment } from '@/providers/types';
import { attachmentDataUri, pickDocument, pickImageFromLibrary, takePhoto } from '@/lib/attachments';

type ChatInputProps = {
  supportsImages: boolean;
  supportsDocuments: boolean;
  sending: boolean;
  onSend: (text: string, attachments: Attachment[]) => void;
  onCancel: () => void;
};

function PendingAttachmentThumb({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.pending, { borderColor: theme.border }]}>
      {attachment.role === 'image' ? (
        <Image
          source={{ uri: attachmentDataUri(attachment) }}
          style={styles.pendingImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.pendingDoc, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.docBadge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.docBadgeText, { color: theme.accentText }]}>DOC</Text>
          </View>
          <Text style={[styles.docName, { color: theme.text }]} numberOfLines={1}>
            {attachment.fileName ?? 'Document'}
          </Text>
        </View>
      )}
      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [
          styles.remove,
          { backgroundColor: pressed ? theme.error : theme.backgroundSelected },
        ]}
      >
        <Text style={{ color: theme.error, fontWeight: '700', fontSize: 12 }}>×</Text>
      </Pressable>
    </View>
  );
}

export function ChatInput({
  supportsImages,
  supportsDocuments,
  sending,
  onSend,
  onCancel,
}: ChatInputProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const canSend = !sending && (text.trim().length > 0 || attachments.length > 0);

  const handleSend = () => {
    if (!canSend) return;
    onSend(text, attachments);
    setText('');
    setAttachments([]);
  };

  const showImageOptions = () => {
    const buttons: Array<{ text: string; onPress?: () => Promise<void> | void; style?: 'cancel' | 'destructive' }> = [
      { text: 'Photo Library', onPress: () => addPicked(() => pickImageFromLibrary()) },
      { text: 'Take Photo', onPress: () => addPicked(() => takePhoto()) },
      { text: 'Cancel', style: 'cancel' },
    ];
    Alert.alert('Add image', undefined, buttons);
  };

  const addPicked = async (picker: () => Promise<Attachment | null>) => {
    try {
      const a = await picker();
      if (a) setAttachments((prev) => [...prev, a]);
    } catch (err) {
      Alert.alert('Could not add attachment', (err as Error).message);
    }
  };

  const imageEnabled = supportsImages && !sending;
  const docEnabled = supportsDocuments && !sending;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom + Spacing.two,
        },
      ]}
    >
      {attachments.length > 0 ? (
        <View style={styles.pendingRow}>
          {attachments.map((a) => (
            <PendingAttachmentThumb
              key={a.id}
              attachment={a}
              onRemove={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.row}>
        <Pressable
          onPress={showImageOptions}
          disabled={!imageEnabled}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: imageEnabled
                ? pressed
                  ? theme.backgroundSelected
                  : theme.backgroundElement
                : theme.backgroundElement,
              opacity: imageEnabled ? 1 : 0.4,
            },
          ]}
          accessibilityLabel="Add image"
        >
          <Text style={[styles.iconLabel, { color: theme.textSecondary }]}>IMG</Text>
        </Pressable>
        <Pressable
          onPress={() => addPicked(pickDocument)}
          disabled={!docEnabled}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: docEnabled
                ? pressed
                  ? theme.backgroundSelected
                  : theme.backgroundElement
                : theme.backgroundElement,
              opacity: docEnabled ? 1 : 0.4,
            },
          ]}
          accessibilityLabel="Add document"
        >
          <Text style={[styles.iconLabel, { color: theme.textSecondary }]}>DOC</Text>
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor={theme.placeholder}
          multiline
          editable={!sending}
          style={[
            styles.input,
            { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
          ]}
        />

        {sending ? (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: pressed ? theme.error : theme.backgroundSelected },
            ]}
            accessibilityLabel="Stop generating"
          >
            <ActivityIndicator size="small" color={theme.error} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: canSend ? theme.accent : theme.backgroundSelected, opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityLabel="Send"
          >
            <Text style={{ color: canSend ? theme.accentText : theme.placeholder, fontSize: 16, fontWeight: '700' }}>
              ↑
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  pendingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  pending: {
    position: 'relative',
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
  },
  pendingImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.small,
  },
  pendingDoc: {
    width: 140,
    height: 64,
    borderRadius: Radius.small,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  docBadge: {
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  docBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  docName: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  iconButton: {
    width: 38,
    height: 40,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.select({ ios: 10, android: 8 }),
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    maxHeight: 140,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

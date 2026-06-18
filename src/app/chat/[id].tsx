import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatInput } from '@/components/chat-input';
import { MessageBubble } from '@/components/message-bubble';
import { ModelPicker } from '@/components/model-picker';
import { Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getModelById } from '@/constants/models';
import { getProviderForModel } from '@/providers/registry';
import type { Attachment, Message } from '@/providers/types';
import { useConversationsStore } from '@/store/conversations';
import { useTemplatesStore } from '@/store/templates';

function useEnsureCurrentConversation(id: string) {
  const open = useConversationsStore((s) => s.open);
  const close = useConversationsStore((s) => s.close);

  useEffect(() => {
    open(id);
    return () => {
      close();
    };
  }, [id, open, close]);
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const messages = useConversationsStore((s) => s.currentMessages);
  const streamingText = useConversationsStore((s) => s.streamingText);
  const sending = useConversationsStore((s) => s.sending);
  const error = useConversationsStore((s) => s.error);
  const currentModelId = useConversationsStore((s) => s.currentModelId);
  const currentTemplateId = useConversationsStore((s) => s.currentTemplateId);
  const sendMessage = useConversationsStore((s) => s.sendMessage);
  const cancelSend = useConversationsStore((s) => s.cancelSend);
  const switchModel = useConversationsStore((s) => s.switchModel);
  const setTemplate = useConversationsStore((s) => s.setTemplate);
  const clearError = useConversationsStore((s) => s.clearError);
  const templates = useTemplatesStore((s) => s.templates);

  const activeTemplate = currentTemplateId
    ? templates.find((t) => t.id === currentTemplateId) ?? null
    : null;

  const [pickerVisible, setPickerVisible] = useState(false);

  useEnsureCurrentConversation(id);

  const model = currentModelId ? getModelById(currentModelId) : undefined;
  const provider = currentModelId ? getProviderForModel(currentModelId) : undefined;
  const supportsImages = !!model && !!provider && provider.supportsAttachments('image', model);
  const supportsDocuments = !!model && !!provider && provider.supportsAttachments('document', model);

  const renderMessages = useMemo<Message[]>(() => {
    if (!streamingText && streamingText !== '') return messages;
    if (!sending || streamingText === null) return messages;
    const streamingMessage: Message = {
      id: '__streaming__',
      role: 'assistant',
      content: streamingText,
      attachments: [],
      modelId: currentModelId ?? undefined,
      createdAt: Date.now(),
    };
    return [...messages, streamingMessage];
  }, [messages, streamingText, sending, currentModelId]);

  useEffect(() => {
    if (renderMessages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [renderMessages.length, streamingText]);

  const handleSend = (text: string, attachments: Attachment[]) => {
    sendMessage(text, attachments.length > 0 ? attachments : undefined);
  };

  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble message={item} streaming={item.id === '__streaming__'} />
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top > 0 ? 0 : Spacing.two }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.accent }]}>{'‹ Back'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={({ pressed }) => [
              styles.modelButton,
              { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
            ]}
          >
            <Text style={[styles.modelLabel, { color: theme.text }]} numberOfLines={1}>
              {model?.label ?? 'Select model'}
            </Text>
            <Text style={[styles.chevron, { color: theme.textSecondary }]}>▾</Text>
          </Pressable>
          <View style={{ width: 60 }} />
        </View>

        {activeTemplate ? (
          <View style={[styles.templateBar, { backgroundColor: theme.accent }]}>
            <Text style={[styles.templateBarLabel, { color: theme.accentText }]} numberOfLines={1}>
              <Text style={styles.templateBarPrefix}>Template · </Text>
              {activeTemplate.name}
            </Text>
            <Pressable
              onPress={() => setTemplate(null)}
              style={styles.templateBarDismiss}
              accessibilityLabel="Detach template"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: theme.accentText, fontWeight: '700' }}>×</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.errorBar, { backgroundColor: theme.error }]}>
            <Text style={[styles.errorText, { color: theme.accentText }]} numberOfLines={2}>
              {error}
            </Text>
            <Pressable onPress={clearError} style={styles.errorDismiss}>
              <Text style={{ color: theme.accentText, fontWeight: '700' }}>×</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={renderMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: Spacing.three, paddingBottom: Spacing.five }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Send a message to start
              </Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Using {model?.label ?? 'a model'} · switch anytime with the button above.
              </Text>
            </View>
          }
        />

        <ChatInput
          supportsImages={supportsImages}
          supportsDocuments={supportsDocuments}
          sending={sending}
          onSend={handleSend}
          onCancel={cancelSend}
        />

        <ModelPicker
          visible={pickerVisible}
          currentModelId={currentModelId ?? ''}
          onSelect={(m) => switchModel(m)}
          onClose={() => setPickerVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minWidth: 60,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    marginHorizontal: Spacing.two,
  },
  modelLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 12,
  },
  errorBar: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  templateBar: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  templateBarLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  templateBarPrefix: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  templateBarDismiss: {
    paddingHorizontal: Spacing.two,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  errorDismiss: {
    paddingHorizontal: Spacing.two,
  },
  empty: {
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

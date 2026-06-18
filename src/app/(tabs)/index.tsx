import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_MODEL_ID, getModelById } from '@/constants/models';
import { useConversationsStore } from '@/store/conversations';
import { useTemplatesStore } from '@/store/templates';
import type { Conversation, Template } from '@/providers/types';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function modelLabel(modelId: string): string {
  return getModelById(modelId)?.label ?? modelId;
}

function PinIcon({ color, filled, size = 16 }: { color: string; filled: boolean; size?: number }) {
  const head = Math.round(size * 0.55);
  const triW = Math.round(size * 0.5);
  const triH = Math.round(size * 0.45);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: head,
          height: head,
          borderRadius: head / 2,
          backgroundColor: filled ? color : 'transparent',
          borderWidth: filled ? 0 : 1.5,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: triW / 2,
          borderRightWidth: triW / 2,
          borderTopWidth: triH,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
          marginTop: -1,
        }}
      />
    </View>
  );
}

export default function ChatListScreen() {
  const theme = useTheme();
  const conversations = useConversationsStore((s) => s.conversations);
  const loadingList = useConversationsStore((s) => s.loadingList);
  const refreshList = useConversationsStore((s) => s.refreshList);
  const createNew = useConversationsStore((s) => s.createNew);
  const open = useConversationsStore((s) => s.open);
  const remove = useConversationsStore((s) => s.remove);
  const togglePin = useConversationsStore((s) => s.togglePin);
  const templates = useTemplatesStore((s) => s.templates);

  useFocusEffect(
    useCallback(() => {
      refreshList();
    }, [refreshList]),
  );

  const handleNew = async () => {
    const id = await createNew(DEFAULT_MODEL_ID);
    await open(id);
    router.push(`/chat/${id}`);
  };

  const handleNewFromTemplate = async (tpl: Template) => {
    const id = await createNew(tpl.modelId, tpl.id);
    await open(id);
    router.push(`/chat/${id}`);
  };

  const handleOpen = async (id: string) => {
    await open(id);
    router.push(`/chat/${id}`);
  };

  const handleDelete = (item: Conversation) => {
    Alert.alert(
      'Delete chat?',
      `"${item.title}" and all its messages and attachments will be permanently removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(item.id) },
      ],
    );
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <Pressable
      onPress={() => handleOpen(item.id)}
      onLongPress={() => handleDelete(item)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
      ]}
    >
      {item.pinned ? <PinIcon color={theme.accent} filled size={12} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
          {modelLabel(item.modelId)} · {formatRelative(item.updatedAt)}
        </Text>
      </View>
      <Pressable
        onPress={() => togglePin(item.id)}
        hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel={item.pinned ? 'Unpin chat' : 'Pin chat'}
      >
        <PinIcon color={item.pinned ? theme.accent : theme.textSecondary} filled={item.pinned} />
      </Pressable>
      <Pressable
        onPress={() => handleDelete(item)}
        hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Delete chat"
      >
        <Text style={[styles.deleteIcon, { color: theme.textSecondary }]}>{'\u00D7'}</Text>
      </Pressable>
    </Pressable>
  );

  const empty = useMemo(
    () => (
      <View style={styles.empty}>
        <ThemedText type="title" style={[styles.emptyTitle, { color: theme.text }]}>
          LLM Picker
        </ThemedText>
        <ThemedText type="small" style={[styles.emptyHint, { color: theme.textSecondary }]}>
          One chat for every model. Add your API keys in Settings, then start a chat.
        </ThemedText>
      </View>
    ),
    [theme],
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Chats</Text>
          <Pressable
            onPress={handleNew}
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: pressed ? theme.accent : theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.newButtonText, { color: theme.accentText }]}>New</Text>
          </Pressable>
        </View>

        {templates.length > 0 ? (
          <View style={[styles.chipsRow, { borderBottomColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {templates.map((tpl) => (
                <Pressable
                  key={tpl.id}
                  onPress={() => handleNewFromTemplate(tpl)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: pressed ? theme.accent : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                  accessibilityLabel={`Start chat from template ${tpl.name}`}
                >
                  <Text style={[styles.chipText, { color: theme.text }]} numberOfLines={1}>
                    {tpl.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />
          )}
          contentContainerStyle={
            conversations.length === 0 ? styles.listEmpty : styles.list
          }
          ListEmptyComponent={!loadingList ? empty : null}
          refreshing={loadingList}
          onRefresh={refreshList}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  newButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  newButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipsRow: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: Spacing.two,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingBottom: Spacing.five,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
  },
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyHint: {
    textAlign: 'center',
    lineHeight: 20,
  },
});

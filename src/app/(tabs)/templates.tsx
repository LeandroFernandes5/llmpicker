import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ModelPicker } from '@/components/model-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_MODEL_ID, getModelById } from '@/constants/models';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Template } from '@/providers/types';
import { useTemplatesStore } from '@/store/templates';

function modelLabel(modelId: string): string {
  return getModelById(modelId)?.label ?? modelId;
}

function TemplateEditor({
  visible,
  editing,
  onClose,
}: {
  visible: boolean;
  editing: Template | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const create = useTemplatesStore((s) => s.create);
  const update = useTemplatesStore((s) => s.update);
  const remove = useTemplatesStore((s) => s.remove);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(
    (tpl: Template | null) => {
      setName(tpl?.name ?? '');
      setPrompt(tpl?.prompt ?? '');
      setModelId(tpl?.modelId ?? DEFAULT_MODEL_ID);
    },
    [],
  );

  useEffect(() => {
    if (visible) reset(editing);
  }, [visible, editing, reset]);

  const canSave = !saving && name.trim().length > 0 && prompt.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, { name: name.trim(), prompt: prompt.trim(), modelId });
      } else {
        await create({ name: name.trim(), prompt: prompt.trim(), modelId });
      }
      onClose();
    } catch (err) {
      Alert.alert('Could not save template', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert(
      'Delete template?',
      `"${editing.name}" will be removed. Chats that used it will keep their messages but lose the system prompt.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await remove(editing.id);
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={[styles.editorHeader, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} style={styles.editorBack}>
            <Text style={[styles.editorBackText, { color: theme.accent }]}>{'‹ Cancel'}</Text>
          </Pressable>
          <Text style={[styles.editorTitle, { color: theme.text }]}>
            {editing ? 'Edit template' : 'New template'}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.editorSave,
              { backgroundColor: canSave ? theme.accent : theme.backgroundSelected, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.editorSaveText, { color: canSave ? theme.accentText : theme.placeholder }]}>
              {saving ? '…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.editorScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Woodworking"
              placeholderTextColor={theme.placeholder}
              style={[
                styles.fieldInput,
                { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Model</Text>
            <Pressable
              onPress={() => setPickerVisible(true)}
              style={({ pressed }) => [
                styles.modelRow,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.modelRowLabel, { color: theme.text }]} numberOfLines={1}>
                {modelLabel(modelId)}
              </Text>
              <Text style={[styles.chevron, { color: theme.textSecondary }]}>▾</Text>
            </Pressable>
            <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
              Pre-selected when you start a chat from this template. You can still swap it mid-chat.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>System prompt</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={'e.g. You are a woodworking assistant. Assume I own Festool and Makita tools…'}
              placeholderTextColor={theme.placeholder}
              multiline
              textAlignVertical="top"
              style={[
                styles.promptInput,
                { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
              ]}
            />
          </View>

          {editing ? (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                { backgroundColor: pressed ? theme.error : theme.backgroundElement, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.deleteText, { color: theme.error }]}>Delete template</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <ModelPicker
          visible={pickerVisible}
          currentModelId={modelId}
          onSelect={setModelId}
          onClose={() => setPickerVisible(false)}
        />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function TemplateCard({
  template,
  onOpen,
}: {
  template: Template;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const preview = template.prompt.replace(/\s+/g, ' ').trim();
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {template.name}
        </Text>
        <View style={[styles.cardPill, { backgroundColor: theme.backgroundSelected }]}>
          <Text style={[styles.cardPillText, { color: theme.textSecondary }]} numberOfLines={1}>
            {modelLabel(template.modelId)}
          </Text>
        </View>
      </View>
      <Text style={[styles.cardPreview, { color: theme.textSecondary }]} numberOfLines={2}>
        {preview.length > 0 ? preview : 'No prompt yet.'}
      </Text>
    </Pressable>
  );
}

export default function TemplatesScreen() {
  const theme = useTheme();
  const templates = useTemplatesStore((s) => s.templates);
  const loading = useTemplatesStore((s) => s.loading);
  const refresh = useTemplatesStore((s) => s.refresh);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openNew = () => {
    setEditing(null);
    setEditorVisible(true);
  };

  const openEdit = (tpl: Template) => {
    setEditing(tpl);
    setEditorVisible(true);
  };

  const renderItem = ({ item }: { item: Template }) => (
    <TemplateCard template={item} onOpen={() => openEdit(item)} />
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Templates</Text>
          <Pressable
            onPress={openNew}
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.newButtonText, { color: theme.accentText }]}>New</Text>
          </Pressable>
        </View>

        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={{ height: Spacing.two }} />
          )}
          contentContainerStyle={templates.length === 0 ? styles.listEmpty : styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <ThemedText type="title" style={[styles.emptyTitle, { color: theme.text }]}>
                  No templates yet
                </ThemedText>
                <ThemedText type="small" style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  A template bundles a system prompt and a pre-selected model. Tap New to create one,
                  then start chats from the Chats tab with one tap.
                </ThemedText>
              </View>
            ) : null
          }
          refreshing={loading}
          onRefresh={refresh}
        />

        <TemplateEditor
          visible={editorVisible}
          editing={editing}
          onClose={() => setEditorVisible(false)}
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
  list: {
    padding: Spacing.four,
    paddingBottom: Spacing.five,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
  },
  card: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  cardPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    maxWidth: 160,
  },
  cardPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardPreview: {
    fontSize: 13,
    lineHeight: 18,
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
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editorBack: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minWidth: 70,
  },
  editorBackText: {
    fontSize: 15,
    fontWeight: '500',
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  editorSave: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    minWidth: 70,
    alignItems: 'center',
  },
  editorSaveText: {
    fontSize: 14,
    fontWeight: '700',
  },
  editorScroll: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  field: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  fieldInput: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.medium,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 44,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.medium,
    borderWidth: 1,
    minHeight: 44,
  },
  modelRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 12,
    marginLeft: Spacing.two,
  },
  promptInput: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 160,
  },
  deleteButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

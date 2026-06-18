import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MODEL_CATALOG } from '@/constants/models';
import type { ModelInfo, ProviderId } from '@/providers/types';

type ModelPickerProps = {
  visible: boolean;
  currentModelId: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
};

const PROVIDER_LABELS: Record<ProviderId, string> = {
  google: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

function CapabilityTag({ label, on, theme }: { label: string; on: boolean; theme: ReturnType<typeof useTheme> }) {
  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: on ? theme.backgroundSelected : 'transparent',
          borderColor: on ? theme.border : 'transparent',
        },
      ]}
    >
      <Text style={[styles.tagText, { color: on ? theme.textSecondary : theme.placeholder }]}>
        {label}
      </Text>
    </View>
  );
}

function ModelRow({
  model,
  selected,
  onPress,
}: {
  model: ModelInfo;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.background,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: theme.text }]}>{model.label}</Text>
        <Text style={[styles.modelId, { color: theme.textSecondary }]} numberOfLines={1}>
          {model.id}
        </Text>
        <View style={styles.tagRow}>
          <CapabilityTag label="Vision" on={model.capabilities.vision} theme={theme} />
          <CapabilityTag label="Docs" on={model.capabilities.documents} theme={theme} />
          <CapabilityTag label="Stream" on={model.capabilities.streaming} theme={theme} />
        </View>
      </View>
      {selected ? (
        <View style={[styles.check, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentText, fontSize: 12, fontWeight: '700' }}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ModelPicker({ visible, currentModelId, onSelect, onClose }: ModelPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const grouped = MODEL_CATALOG.reduce<Record<ProviderId, ModelInfo[]>>(
    (acc, m) => {
      (acc[m.providerId] ??= []).push(m);
      return acc;
    },
    { google: [], openai: [], anthropic: [] },
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: insets.bottom + Spacing.two,
          },
        ]}
      >
        <View style={styles.handle} />
        <Text style={[styles.title, { color: theme.text }]}>Choose a model</Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.three }}>
          {(Object.keys(grouped) as ProviderId[]).map((providerId) => {
            const models = grouped[providerId];
            if (models.length === 0) return null;
            return (
              <View key={providerId} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {PROVIDER_LABELS[providerId]}
                </Text>
                {models.map((m) => (
                  <ModelRow
                    key={m.id}
                    model={m}
                    selected={m.id === currentModelId}
                    onPress={() => {
                      onSelect(m.id);
                      onClose();
                    }}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    minHeight: '55%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginTop: Spacing.two,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  section: {
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two,
    gap: Spacing.three,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  modelId: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

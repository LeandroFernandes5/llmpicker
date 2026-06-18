import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApiKeysStore } from '@/store/api-keys';
import { PROVIDER_LIST } from '@/providers/registry';
import type { ProviderId } from '@/providers/types';

const HELP_URLS: Record<ProviderId, string> = {
  google: 'https://aistudio.google.com/apikey',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
};

function ProviderKeyRow({ providerId, label }: { providerId: ProviderId; label: string }) {
  const theme = useTheme();
  const keys = useApiKeysStore((s) => s.keys);
  const setKey = useApiKeysStore((s) => s.setKey);
  const clearKey = useApiKeysStore((s) => s.clearKey);

  const stored = keys[providerId];
  const [draft, setDraft] = useState('');
  const [reveal, setReveal] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft('');
  }, [providerId]);

  const hasStored = stored.length > 0;
  const canSave = draft.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await setKey(providerId, draft);
    setDraft('');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.rowHeader}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {hasStored ? (
          <View style={[styles.pill, { backgroundColor: theme.success }]}>
            <Text style={[styles.pillText, { color: theme.accentText }]}>Set</Text>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.pillText, { color: theme.textSecondary }]}>Not set</Text>
          </View>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={hasStored ? '•••••••• (enter a new key to replace)' : 'Paste your API key'}
          placeholderTextColor={theme.placeholder}
          secureTextEntry={!reveal}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={[
            styles.input,
            { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
          ]}
        />
        <Pressable
          onPress={() => setReveal((r) => !r)}
          style={({ pressed }) => [
            styles.toggle,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.toggleText, { color: theme.textSecondary }]}>
            {reveal ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: canSave ? theme.accent : theme.backgroundSelected, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.actionText, { color: canSave ? theme.accentText : theme.textSecondary }]}>
            {savedFlash ? 'Saved' : hasStored ? 'Update' : 'Save'}
          </Text>
        </Pressable>
        {hasStored ? (
          <Pressable
            onPress={() => clearKey(providerId)}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: pressed ? theme.backgroundSelected : theme.background, borderColor: theme.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.actionText, { color: theme.error }]}>Clear</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => Linking.openURL(HELP_URLS[providerId])} style={styles.linkButton}>
          <Text style={[styles.linkText, { color: theme.accent }]}>Get a key →</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="small" style={[styles.sectionHint, { color: theme.textSecondary }]}>
            API keys are stored only on this device, encrypted in the system keystore.
          </ThemedText>
          {PROVIDER_LIST.map((p) => (
            <ProviderKeyRow key={p.id} providerId={p.id} label={p.label} />
          ))}
          <View style={{ height: Spacing.five }} />
          <ThemedText type="small" style={[styles.footer, { color: theme.textSecondary }]}>
            LLM Picker · v1.0.0
          </ThemedText>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  scroll: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  sectionHint: {
    lineHeight: 20,
  },
  row: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.medium,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 40,
  },
  toggle: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.medium,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    minHeight: 36,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
  },
});

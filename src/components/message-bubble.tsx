import { memo, useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Attachment, Message } from '@/providers/types';
import { attachmentDataUri } from '@/lib/attachments';

type MessageBubbleProps = {
  message: Message;
  streaming?: boolean;
};

function ImageThumb({ attachment }: { attachment: Attachment }) {
  const uri = useMemo(() => attachmentDataUri(attachment), [attachment]);
  return (
    <Image
      source={{ uri }}
      style={styles.image}
      resizeMode="cover"
      accessibilityLabel={attachment.fileName ?? 'Attached image'}
    />
  );
}

function DocumentChip({ attachment }: { attachment: Attachment }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => Linking.openURL(attachmentDataUri(attachment)).catch(() => {})}
      style={({ pressed }) => [
        styles.docChip,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.background,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.docBadge, { backgroundColor: theme.accent }]}>
        <Text style={[styles.docBadgeText, { color: theme.accentText }]}>DOC</Text>
      </View>
      <Text style={[styles.docName, { color: theme.text }]} numberOfLines={1}>
        {attachment.fileName ?? 'Document'}
      </Text>
    </Pressable>
  );
}

function MessageBubbleImpl({ message, streaming }: MessageBubbleProps) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const images = message.attachments.filter((a) => a.role === 'image');
  const docs = message.attachments.filter((a) => a.role === 'document');
  const showText = message.content.length > 0 || !!streaming;
  const bubbleBg = isUser ? theme.userBubble : theme.assistantBubble;
  const textColor = isUser ? theme.userBubbleText : theme.assistantBubbleText;

  const markdownStyles = useMemo(
    () => ({
      body: { color: textColor, fontSize: 15, lineHeight: 21 },
      heading1: { color: textColor, fontSize: 22, fontWeight: '700' as const, marginTop: 8, marginBottom: 4 },
      heading2: { color: textColor, fontSize: 19, fontWeight: '700' as const, marginTop: 6, marginBottom: 3 },
      heading3: { color: textColor, fontSize: 17, fontWeight: '700' as const, marginTop: 4, marginBottom: 2 },
      heading4: { color: textColor, fontSize: 16, fontWeight: '700' as const, marginTop: 4, marginBottom: 2 },
      heading5: { color: textColor, fontSize: 15, fontWeight: '700' as const, marginTop: 4, marginBottom: 2 },
      heading6: { color: textColor, fontSize: 14, fontWeight: '700' as const, marginTop: 4, marginBottom: 2 },
      strong: { fontWeight: '700' as const },
      em: { fontStyle: 'italic' as const },
      s: { textDecorationLine: 'line-through' as const },
      code_inline: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: 'rgba(128,128,128,0.2)',
      },
      code_block: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: 'rgba(128,128,128,0.15)',
        padding: 8,
        borderRadius: 6,
        marginVertical: 4,
      },
      fence: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: 'rgba(128,128,128,0.15)',
        padding: 8,
        borderRadius: 6,
        marginVertical: 4,
      },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(128,128,128,0.4)',
        paddingLeft: 8,
        marginVertical: 4,
      },
      bullet_list: { marginVertical: 4 },
      ordered_list: { marginVertical: 4 },
      link: { color: theme.accent, textDecorationLine: 'underline' as const },
    }),
    [textColor, theme.accent],
  );

  const renderText = () => {
    if (isUser) {
      return <Text style={[styles.text, { color: textColor }]}>{message.content}</Text>;
    }
    if (message.content.length === 0 && streaming) {
      return <Text style={[styles.text, { color: textColor }]}>…</Text>;
    }
    return (
      <>
        <Markdown style={markdownStyles}>{message.content}</Markdown>
        {streaming ? (
          <Text style={{ color: textColor, fontSize: 15, lineHeight: 21 }}> ▋</Text>
        ) : null}
      </>
    );
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={{ maxWidth: '85%' }}>
        {images.length > 0 ? (
          <View style={[styles.attachments, isUser ? { justifyContent: 'flex-end' } : null]}>
            {images.map((a) => (
              <ImageThumb key={a.id} attachment={a} />
            ))}
          </View>
        ) : null}
        {docs.length > 0 ? (
          <View style={[styles.attachments, isUser ? { justifyContent: 'flex-end' } : null]}>
            {docs.map((a) => (
              <DocumentChip key={a.id} attachment={a} />
            ))}
          </View>
        ) : null}
        {showText ? (
          <View style={[styles.bubble, { backgroundColor: bubbleBg }]}>{renderText()}</View>
        ) : null}
      </View>
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one + 2,
    flexDirection: 'row',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.large,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.one + 2,
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: Radius.medium,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 240,
  },
  docBadge: {
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  docName: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
});

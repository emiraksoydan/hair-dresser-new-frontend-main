import React, { useEffect, useRef } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import Constants from 'expo-constants';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import {
  BIO_MAX_LENGTH,
  bioPlainLength,
  bioToPlainDisplay,
  emptyBioHtml,
  normalizeBioForEditor,
  plainToBioHtml,
} from '../../utils/social/socialBioFormat';

/** TenTap WebView tabanlıdır; Expo Go'da klavye odaklanması çalışmaz. */
const isExpoGo = Constants.appOwnership === 'expo';

type Props = {
  value: string;
  onChangeText: (html: string) => void;
  placeholder: string;
  editable?: boolean;
  resetKey?: string;
};

const SocialBioEditorFallback: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder,
  editable = true,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const plain = bioToPlainDisplay(value);
  const plainLen = bioPlainLength(value);

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderColor: colors.borderColor2,
          backgroundColor: colors.cardBg,
          paddingBottom: 0,
        },
      ]}
    >
      <PaperTextInput
        mode="outlined"
        multiline
        value={plain}
        onChangeText={(text) => onChangeText(plainToBioHtml(text))}
        placeholder={placeholder}
        editable={editable}
        maxLength={BIO_MAX_LENGTH}
        outlineColor={colors.borderColor2}
        activeOutlineColor={SOCIAL_ACCENT}
        textColor={colors.headerText}
        placeholderTextColor={colors.textTertiary}
        style={{
          backgroundColor: colors.cardBg,
          minHeight: 140,
          maxHeight: 220,
        }}
        outlineStyle={{ borderRadius: 12, borderWidth: 0 }}
        contentStyle={{ paddingVertical: 12 }}
      />
      <View style={[styles.footer, { borderTopColor: colors.borderColor2, position: 'relative' }]}>
        <Text className="text-[11px] flex-1" style={{ color: colors.textTertiary }}>
          {t('social.bioExpoGoHint')}
        </Text>
        <Text
          className="text-[11px] font-medium"
          style={{ color: plainLen > BIO_MAX_LENGTH ? '#ef4444' : colors.textTertiary }}
        >
          {plainLen}/{BIO_MAX_LENGTH}
        </Text>
      </View>
    </View>
  );
};

const SocialBioEditorTenTap: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder,
  editable = true,
  resetKey,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const lastEmitted = useRef(value);
  const lastResetKey = useRef(resetKey);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    dynamicHeight: true,
    editable,
    initialContent: normalizeBioForEditor(value),
    onChange: () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(async () => {
        try {
          const html = (await editor.getHTML()) || emptyBioHtml();
          if (html === lastEmitted.current) return;
          lastEmitted.current = html;
          onChangeText(html);
        } catch {
          /* editör henüz hazır değil */
        }
      }, 250);
    },
  });

  useEffect(() => {
    editor.setPlaceholder?.(placeholder);
  }, [editor, placeholder]);

  useEffect(() => {
    if (resetKey === lastResetKey.current) return;
    lastResetKey.current = resetKey;
    const normalized = normalizeBioForEditor(value);
    editor.setContent(normalized);
    lastEmitted.current = normalized;
  }, [resetKey, value, editor]);

  useEffect(
    () => () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    },
    [],
  );

  const plainLen = bioPlainLength(value);

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderColor: colors.borderColor2,
          backgroundColor: colors.cardBg,
        },
      ]}
    >
      <View style={styles.editorArea}>
        <RichText editor={editor} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.toolbarKav}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>

      <View style={[styles.footer, { borderTopColor: colors.borderColor2 }]}>
        <Text className="text-[11px] flex-1" style={{ color: colors.textTertiary }}>
          {t('social.bioTentapHint')}
        </Text>
        <Text
          className="text-[11px] font-medium"
          style={{ color: plainLen > BIO_MAX_LENGTH ? '#ef4444' : colors.textTertiary }}
        >
          {plainLen}/{BIO_MAX_LENGTH}
        </Text>
      </View>
    </View>
  );
};

export const SocialBioEditor: React.FC<Props> = (props) =>
  isExpoGo ? <SocialBioEditorFallback {...props} /> : <SocialBioEditorTenTap {...props} />;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 180,
    paddingBottom: 44,
  },
  editorArea: {
    minHeight: 120,
    paddingHorizontal: 4,
  },
  toolbarKav: {
    position: 'absolute',
    width: '100%',
    bottom: 36,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    position: 'absolute',
    width: '100%',
    bottom: 0,
  },
});

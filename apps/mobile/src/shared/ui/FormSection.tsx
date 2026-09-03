import { theme } from '@shared/config/colors';
import { HIT_SIZE, radius, spacing, typography } from '@shared/config/tokens';
import { type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface FormSectionProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
}

export function FormSection({ label, required, helper, error, children }: FormSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required ? <Text style={styles.required}>필수</Text> : null}
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {children}
      {/* 에러는 필드 바로 아래에 둔다 — 상단 요약만 있으면 어느 칸이 틀렸는지 모른다 */}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

interface FieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  maxLength?: number;
  invalid?: boolean;
  testID?: string;
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType = 'default',
  maxLength,
  invalid,
  testID,
}: FieldProps) {
  return (
    <TextInput accessibilityLabel="Text input field"
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.placeholder}
      multiline={multiline}
      keyboardType={keyboardType}
      maxLength={maxLength}
      style={[styles.input, multiline && styles.inputMultiline, invalid && styles.inputInvalid]}
    />
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xxs, marginBottom: spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  label: { ...typography.bodyStrong, color: theme.colors.text },
  required: { ...typography.micro, color: theme.colors.primaryDark },
  helper: { ...typography.caption, color: theme.colors.textTertiary },
  input: {
    minHeight: HIT_SIZE + 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.surface,
    ...typography.body,
    color: theme.colors.text,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  inputInvalid: { borderColor: theme.colors.error },
  error: { ...typography.caption, color: theme.colors.error },
});

import { useConnection } from '@features/connections';
import { PARENT_INTENT_LABELS, useMeetingMutations } from '@features/meetings';
import type { ParentIntentKind } from '@shared/api/booting.types';
import { theme } from '@shared/config/colors';
import { radius, spacing, typography } from '@shared/config/tokens';
import { AppButton, DestructiveConfirmDialog, Screen, useToast } from '@shared/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * 부모님 의사 확인.
 *
 * 자녀가 부모님께 직접 여쭤본 결과를 대신 입력하는 화면이다. 그래서 문구가
 * 전부 "~라고 하세요" 형태다 — 자녀 본인의 의사와 혼동되면 안 된다.
 */
export default function ParentIntentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const { data: connection } = useConnection(id);
  const { setParentIntent } = useMeetingMutations(id ?? '');
  const [selected, setSelected] = useState<ParentIntentKind | null>(
    connection?.myParentIntent ?? null
  );
  const [confirmDecline, setConfirmDecline] = useState(false);

  const submit = (intent: ParentIntentKind) => {
    setParentIntent.mutate(intent, {
      onSuccess: () => {
        toast.show({ message: '부모님 의사를 전달했습니다' });
        router.back();
      },
      onError: (error: Error) => toast.show({ message: error.message }),
    });
  };

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="전달하기"
          disabled={!selected}
          loading={setParentIntent.isPending}
          testID="intent-submit"
          onPress={() => {
            if (!selected) return;
            // 거절은 대화를 끝낸다 — 되돌릴 수 없으므로 한 번 더 확인한다
            if (selected === 'declined') setConfirmDecline(true);
            else submit(selected);
          }}
        />
      }
    >
      <Text style={styles.title}>부모님께 여쭤보셨나요?</Text>
      <Text style={styles.body}>
        {connection?.partner.maskedName} 님을 만나보실 의향이 있으신지 부모님께 직접 여쭤본 뒤,
        답변을 그대로 선택해주세요. 상대측에도 같은 확인이 필요합니다.
      </Text>

      <View style={styles.options}>
        {PARENT_INTENT_LABELS.map((option) => {
          const on = selected === option.key;
          return (
            <Pressable
              key={option.key}
              testID={`intent-${option.key}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => setSelected(option.key)}
              style={({ pressed }) => [
                styles.option,
                on && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionLabel, on && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              <Text style={styles.optionHint}>{option.hint}</Text>
            </Pressable>
          );
        })}
      </View>

      {connection?.partnerRespondedIntent ? (
        <Text style={styles.note}>상대측은 이미 답변을 보냈습니다.</Text>
      ) : (
        <Text style={styles.note}>
          양측 모두 &lsquo;만나보고 싶다&rsquo;고 답해야 만남 일정을 잡을 수 있습니다.
        </Text>
      )}

      <DestructiveConfirmDialog
        visible={confirmDecline}
        title="대화를 종료하시겠습니까?"
        body="부모님이 만나지 않겠다고 하시면 이 인연은 종료됩니다. 다시 되돌릴 수 없습니다."
        confirmLabel="종료하기"
        busy={setParentIntent.isPending}
        onCancel={() => setConfirmDecline(false)}
        onConfirm={() => {
          setConfirmDecline(false);
          submit('declined');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: theme.colors.text, marginTop: spacing.sm },
  body: { ...typography.body, color: theme.colors.textSecondary, marginTop: spacing.xs },
  options: { gap: spacing.xs, marginTop: spacing.lg },
  option: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    gap: 2,
  },
  optionSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  optionLabel: { ...typography.bodyStrong, color: theme.colors.text },
  optionLabelSelected: { color: theme.colors.primaryDark },
  optionHint: { ...typography.caption, color: theme.colors.textTertiary },
  note: { ...typography.caption, color: theme.colors.textTertiary, marginTop: spacing.md },
  pressed: { opacity: 0.85 },
});

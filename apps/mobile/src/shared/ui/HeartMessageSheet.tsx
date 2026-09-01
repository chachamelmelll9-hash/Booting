import { theme } from '@shared/config/colors';
import { spacing, typography } from '@shared/config/tokens';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from './AppButton';
import { BottomSheet } from './BottomSheet';
import { TextField } from './FormSection';

export const MAX_HEART_MESSAGE = 200;

interface Props {
  visible: boolean;
  /** 누구에게 보내는지 — 무엇을 쓸지 떠올리게 돕는다 */
  toName?: string;
  busy?: boolean;
  onSend: (message?: string) => void;
  onDismiss: () => void;
}

/**
 * 관심과 함께 보낼 인사말.
 *
 * 상호 하트가 되면 이 문장이 대화방 첫 메시지로 남는다. 빈 채팅방에서 먼저
 * 말을 트는 부담이 대화가 끊기는 가장 큰 이유라, 관심을 보내는 순간에
 * 한마디를 남겨두면 그 부담이 사라진다.
 *
 * 그냥 보내기도 항상 열어둔다 — 인사말을 강제하면 관심 보내기 자체가 일이 된다.
 */
export function HeartMessageSheet({ visible, toName, busy = false, onSend, onDismiss }: Props) {
  const [message, setMessage] = useState('');

  // 시트를 닫았다 다시 열면 이전 입력이 남아 엉뚱한 상대에게 갈 수 있다
  useEffect(() => {
    if (visible) setMessage('');
  }, [visible]);

  const trimmed = message.trim();

  return (
    <BottomSheet
      visible={visible}
      title={toName ? `${toName} 님께 관심 보내기` : '관심 보내기'}
      onDismiss={onDismiss}
      testID="heart-message-sheet"
      footer={
        <>
          <AppButton
            label={trimmed ? '인사말과 함께 보내기' : '관심만 보내기'}
            loading={busy}
            testID="heart-message-send"
            onPress={() => onSend(trimmed || undefined)}
          />
          <AppButton label="취소" variant="ghost" onPress={onDismiss} />
        </>
      }
    >
      <Text style={styles.hint}>
        서로 관심을 보내면 이 인사말이 대화방에 그대로 남습니다. 부모님의 일상 중
        겹치는 부분을 적어주시면 이야기가 이어지기 쉽습니다.
      </Text>

      <TextField
        testID="heart-message-input"
        value={message}
        onChangeText={setMessage}
        placeholder="예: 저희 어머니도 매일 오전 광교호수공원 산책 가십니다!"
        multiline
        maxLength={MAX_HEART_MESSAGE}
      />

      <Text style={styles.counter}>
        {message.length} / {MAX_HEART_MESSAGE}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.caption, color: theme.colors.textTertiary },
  counter: {
    ...typography.micro,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xxs,
  },
});

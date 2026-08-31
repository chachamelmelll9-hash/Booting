import { AuthStyles } from '@features/auth';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text,
} from 'react-native';

interface FormButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

const pressedStyle = { opacity: 0.7 };

export function FormButton({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  ...props
}: FormButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        AuthStyles.button,
        variant === 'secondary' && AuthStyles.buttonSecondary,
        isDisabled && AuthStyles.buttonDisabled,
        pressed && !isDisabled && pressedStyle,
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text
          style={[
            AuthStyles.buttonText,
            variant === 'secondary' && AuthStyles.buttonSecondaryText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { AuthStyles } from '@features/auth';
import { AuthColors } from '@shared/config/colors';
import React, { useState } from 'react';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import {
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

interface ControlledPasswordInputProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'secureTextEntry'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export function ControlledPasswordInput<T extends FieldValues>({
  control,
  name,
  label,
  ...props
}: ControlledPasswordInputProps<T>) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={AuthStyles.inputContainer}>
          <Text style={AuthStyles.label}>{label}</Text>
          <View style={AuthStyles.passwordContainer}>
            <TextInput
              style={[
                AuthStyles.input,
                AuthStyles.passwordInput,
                isFocused && AuthStyles.inputFocused,
                error && AuthStyles.inputError,
              ]}
              value={value}
              onChangeText={onChange}
              onBlur={() => {
                setIsFocused(false);
                onBlur();
              }}
              onFocus={() => setIsFocused(true)}
              secureTextEntry={!showPassword}
              placeholderTextColor={AuthColors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={label}
              {...props}
            />
            <Pressable accessibilityRole="button"
              style={AuthStyles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={AuthStyles.passwordToggleText}>
                {showPassword ? '숨기기' : '보기'}
              </Text>
            </Pressable>
          </View>
          {error?.message ? (
            <Text style={AuthStyles.errorText}>
              {t(error.message, { defaultValue: error.message })}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

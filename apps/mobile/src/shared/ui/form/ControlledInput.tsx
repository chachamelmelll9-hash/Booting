import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { AuthStyles } from '@features/auth';
import { AuthColors } from '@shared/config/colors';
import React, { useState } from 'react';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import {
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

interface ControlledInputProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  label,
  ...props
}: ControlledInputProps<T>) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={AuthStyles.inputContainer}>
          <Text style={AuthStyles.label}>{label}</Text>
          <TextInput
            style={[
              AuthStyles.input,
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
            placeholderTextColor={AuthColors.placeholder}
            autoCapitalize="none"
            accessibilityLabel={label}
            {...props}
          />
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

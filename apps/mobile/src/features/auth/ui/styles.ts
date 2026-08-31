import { AuthColors } from '@shared/config/colors';
import { StyleSheet } from 'react-native';

export const AuthStyles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },

  // Header
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AuthColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AuthColors.textSecondary,
    lineHeight: 24,
  },

  // Form
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AuthColors.text,
  },
  input: {
    backgroundColor: AuthColors.inputBg,
    borderWidth: 1,
    borderColor: AuthColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: AuthColors.text,
  },
  inputFocused: {
    borderColor: AuthColors.borderFocused,
  },
  inputError: {
    borderColor: AuthColors.error,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  passwordToggleText: {
    color: AuthColors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    color: AuthColors.error,
    marginTop: 4,
  },

  // Buttons
  button: {
    backgroundColor: AuthColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: AuthColors.disabled,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AuthColors.border,
  },
  buttonSecondaryText: {
    color: AuthColors.text,
  },

  // Links
  linkContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  link: {
    color: AuthColors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  linkText: {
    color: AuthColors.textSecondary,
    fontSize: 14,
  },

  // Messages
  messageContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: AuthColors.errorBg,
    borderWidth: 1,
    borderColor: AuthColors.error,
  },
  successContainer: {
    backgroundColor: AuthColors.successBg,
    borderWidth: 1,
    borderColor: AuthColors.success,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorMessageText: {
    color: AuthColors.error,
  },
  successMessageText: {
    color: AuthColors.success,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AuthColors.border,
  },
  dividerText: {
    color: AuthColors.textSecondary,
    paddingHorizontal: 16,
    fontSize: 14,
  },
});

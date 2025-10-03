import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const baseClasses = 'px-6 py-4 rounded-xl items-center justify-center';
  const variantClasses = {
    primary: 'bg-primary active:bg-primary-dark',
    secondary: 'bg-surface-light active:bg-surface',
    ghost: 'bg-transparent active:bg-surface',
  };

  const textClasses = {
    primary: 'text-background font-semibold text-base',
    secondary: 'text-text font-semibold text-base',
    ghost: 'text-text-secondary font-medium text-base',
  };

  const disabledClasses = disabled || loading ? 'opacity-50' : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#0A0A0A' : '#FAFAFA'} />
      ) : (
        <Text className={textClasses[variant]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}


export { Button }
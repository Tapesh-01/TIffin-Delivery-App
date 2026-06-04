import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Radius, Shadows } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  style,
  textStyle,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: false,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: false,
      speed: 50,
    }).start();
    if (!disabled && !loading) onPress();
  };

  const sizeMap = {
    sm: { paddingVertical: 10, fontSize: Typography.fontSize.sm },
    md: { paddingVertical: 15, fontSize: Typography.fontSize.base },
    lg: { paddingVertical: 18, fontSize: Typography.fontSize.md },
  };

  const s = sizeMap[size];

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? Colors.textOnPrimary : Colors.primary} />
  ) : (
    <View style={styles.row}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text
        style={[
          styles.text,
          {
            fontSize: s.fontSize,
            color: variant === 'primary' ? Colors.textOnPrimary : Colors.primary,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </View>
  );

  if (variant === 'primary') {
    return (
      <Animated.View
        style={[
          fullWidth && styles.fullWidth,
          { transform: [{ scale }] },
          style,
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
        >
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.button,
              { paddingVertical: s.paddingVertical },
              Shadows.button,
              disabled && styles.disabled,
            ]}
          >
            {content}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const variantMap = {
    secondary: { bg: Colors.accentLight, text: Colors.accent, border: 'transparent' },
    outline: { bg: 'transparent', text: Colors.primary, border: Colors.primary },
    ghost: { bg: 'transparent', text: Colors.primary, border: 'transparent' },
    danger: { bg: '#FFEBEE', text: Colors.danger, border: 'transparent' },
  };

  const v = variantMap[variant as keyof typeof variantMap] ?? variantMap.outline;

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        { transform: [{ scale }] },
        style,
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          {
            backgroundColor: v.bg,
            borderColor: v.border,
            borderWidth: variant === 'outline' ? 1.5 : 0,
            paddingVertical: s.paddingVertical,
          },
          disabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.text} />
        ) : (
          <View style={styles.row}>
            {icon && <View style={styles.iconWrap}>{icon}</View>}
            <Text style={[styles.text, { fontSize: s.fontSize, color: v.text }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  button: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: { marginRight: 8 },
  text: {
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.3,
  },
  disabled: { opacity: 0.5 },
});

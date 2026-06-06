import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView
} from 'react-native';
import { Colors } from '../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../constants/theme';

const { width } = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

// Static references to trigger alerts from anywhere (even non-React files)
let showToastStatic: (title: string, message: string, type?: AlertType) => void = () => {};
let showAlertStatic: (
  title: string,
  message: string,
  buttons?: AlertButton[]
) => void = () => {};

export const showToast = (title: string, message: string, type: AlertType = 'info') => {
  showToastStatic(title, message, type);
};

export const showAlert = (
  title: string,
  message: string,
  buttons?: AlertButton[]
) => {
  showAlertStatic(title, message, buttons);
};

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

interface ToastState {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
}

export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Animation values
  const toastY = useRef(new Animated.Value(-120)).current;
  const alertScale = useRef(new Animated.Value(0.9)).current;
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<any>(null);

  // Link static actions to local state functions
  useEffect(() => {
    showToastStatic = (title, message, type = 'info') => {
      // Clear existing timeout
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setToast({ visible: true, title, message, type });

      // Slide Down
      Animated.spring(toastY, {
        toValue: Platform.OS === 'ios' ? 44 : 24,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();

      // Auto Dismiss
      toastTimeoutRef.current = setTimeout(() => {
        dismissToast();
      }, 3000);
    };

    showAlertStatic = (title, message, buttons = []) => {
      // If no buttons, add a default 'OK' button
      const finalButtons = buttons.length > 0 
        ? buttons 
        : [{ text: 'OK', style: 'default' as const }];

      setAlert({ visible: true, title, message, buttons: finalButtons });

      // Scale up & Fade in
      Animated.parallel([
        Animated.timing(alertOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        }),
        Animated.spring(alertScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8
        })
      ]).start();
    };

    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const dismissToast = () => {
    Animated.timing(toastY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setToast(prev => ({ ...prev, visible: false }));
    });
  };

  const handleAlertButtonPress = (btn: AlertButton) => {
    // Fade out & Scale down
    Animated.parallel([
      Animated.timing(alertOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(alertScale, {
        toValue: 0.9,
        duration: 180,
        useNativeDriver: true
      })
    ]).start(() => {
      setAlert(prev => ({ ...prev, visible: false }));
      if (btn.onPress) {
        btn.onPress();
      }
    });
  };

  // Helper to get Toast styles/colors based on type
  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          bgColor: '#FFFFFF',
          borderColor: '#2ECC71',
          emoji: '🎉',
          textColor: '#2ECC71'
        };
      case 'error':
        return {
          bgColor: '#FFFFFF',
          borderColor: '#E74C3C',
          emoji: '⚠️',
          textColor: '#E74C3C'
        };
      case 'warning':
        return {
          bgColor: '#FFFFFF',
          borderColor: '#F39C12',
          emoji: '🚨',
          textColor: '#F39C12'
        };
      case 'info':
      default:
        return {
          bgColor: '#FFFFFF',
          borderColor: Colors.primary,
          emoji: '🔔',
          textColor: Colors.primary
        };
    }
  };

  const toastConfig = getToastConfig();

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* Floating Toast Notification Banner */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: toastY }],
              borderLeftColor: toastConfig.borderColor,
              backgroundColor: toastConfig.bgColor
            }
          ]}
        >
          <Text style={styles.toastEmoji}>{toastConfig.emoji}</Text>
          <View style={styles.toastTextContainer}>
            <Text style={[styles.toastTitle, { color: Colors.textPrimary }]}>{toast.title}</Text>
            <Text style={styles.toastMessage}>{toast.message}</Text>
          </View>
          <TouchableOpacity onPress={dismissToast} style={styles.toastCloseBtn}>
            <Text style={styles.toastCloseText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Centered Alert Modal Dialog */}
      <Modal
        visible={alert.visible}
        transparent={true}
        animationType="none"
        onRequestClose={() => handleAlertButtonPress({ text: 'Cancel' })}
      >
        <Animated.View style={[styles.alertBackdrop, { opacity: alertOpacity }]}>
          <Animated.View
            style={[
              styles.alertCard,
              { transform: [{ scale: alertScale }] }
            ]}
          >
            {/* Header Icon */}
            <View style={styles.alertIconWrapper}>
              <Text style={{ fontSize: 28 }}>🍱</Text>
            </View>

            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>

            {/* Buttons Row / Column */}
            <View
              style={[
                styles.btnContainer,
                alert.buttons.length > 2 ? styles.btnContainerCol : styles.btnContainerRow
              ]}
            >
              {alert.buttons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                
                let btnStyle: any = styles.btnDefault;
                let textStyle: any = styles.btnTextDefault;

                if (isCancel) {
                  btnStyle = styles.btnCancel;
                  textStyle = styles.btnTextCancel;
                } else if (isDestructive) {
                  btnStyle = styles.btnDestructive;
                  textStyle = styles.btnTextDestructive;
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.85}
                    onPress={() => handleAlertButtonPress(btn)}
                    style={[
                      styles.btnBase,
                      btnStyle,
                      alert.buttons.length > 2 && { width: '100%', marginBottom: 8 }
                    ]}
                  >
                    <Text style={[styles.btnTextBase, textStyle]}>{btn.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Toast Styles
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10
      },
      android: {
        elevation: 6
      }
    })
  },
  toastEmoji: {
    fontSize: 22,
    marginRight: Spacing.sm
  },
  toastTextContainer: {
    flex: 1
  },
  toastTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    marginBottom: 2
  },
  toastMessage: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary
  },
  toastCloseBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm
  },
  toastCloseText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: 'bold'
  },

  // Alert Dialog Styles
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 10, 0, 0.6)', // matching theme brand transparent dark bg
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg
  },
  alertCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24
      },
      android: {
        elevation: 10
      }
    })
  },
  alertIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF0EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFE0D5'
  },
  alertTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm
  },
  alertMessage: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg
  },
  btnContainer: {
    width: '100%'
  },
  btnContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm
  },
  btnContainerCol: {
    flexDirection: 'column',
    alignItems: 'center'
  },
  btnBase: {
    flex: 1,
    paddingVertical: Spacing.md - 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnTextBase: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm
  },
  // Default confirm style (Orange Gradient)
  btnDefault: {
    backgroundColor: Colors.primary
  },
  btnTextDefault: {
    color: '#FFFFFF'
  },
  // Cancel button style (Grey outline style)
  btnCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  btnTextCancel: {
    color: '#374151'
  },
  // Destructive style (Red)
  btnDestructive: {
    backgroundColor: '#EF4444'
  },
  btnTextDestructive: {
    color: '#FFFFFF'
  }
});

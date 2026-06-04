import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Platform } from 'react-native';

interface SwipeButtonProps {
  title: string;
  onSwipeComplete: () => void;
  color?: string;
  disabled?: boolean;
}

export const SwipeButton: React.FC<SwipeButtonProps> = ({
  title,
  onSwipeComplete,
  color = '#EF4444',
  disabled = false,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [swipeCompleted, setSwipeCompleted] = useState(false);
  const containerWidthRef = useRef(0);
  const handleWidth = 48; // drag handle size

  const handleWebPress = () => {
    if (Platform.OS === 'web' && !disabled && !swipeCompleted) {
      const maxDx = containerWidthRef.current - handleWidth - 8;
      Animated.timing(pan.x, {
        toValue: maxDx,
        duration: 250,
        useNativeDriver: false,
      }).start(() => {
        setSwipeCompleted(true);
        onSwipeComplete();
      });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !swipeCompleted,
      onMoveShouldSetPanResponder: () => !disabled && !swipeCompleted,
      onPanResponderMove: (e, gestureState) => {
        if (disabled || swipeCompleted) return;
        const maxDx = containerWidthRef.current - handleWidth - 8; // border padding margins
        const newX = Math.max(0, Math.min(gestureState.dx, maxDx));
        pan.x.setValue(newX);
      },
      onPanResponderRelease: (e, gestureState) => {
        if (disabled || swipeCompleted) return;
        const maxDx = containerWidthRef.current - handleWidth - 8;
        if (gestureState.dx >= maxDx * 0.75) {
          // Swipe completed! snap to end
          Animated.timing(pan.x, {
            toValue: maxDx,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            setSwipeCompleted(true);
            onSwipeComplete();
          });
        } else {
          // Snap back to start
          Animated.spring(pan.x, {
            toValue: 0,
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Sync state if disabled status toggled to reset
  React.useEffect(() => {
    if (disabled) {
      setSwipeCompleted(false);
      pan.x.setValue(0);
    }
  }, [disabled]);

  return (
    <View
      style={[
        styles.container,
        { 
          borderColor: disabled ? '#E2E8F0' : color, 
          opacity: disabled ? 0.6 : 1,
          // @ts-ignore
          cursor: (Platform.OS === 'web' ? (disabled ? 'not-allowed' : 'pointer') : undefined) as any
        },
      ]}
      onLayout={(event) => {
        containerWidthRef.current = event.nativeEvent.layout.width;
      }}
      // @ts-ignore
      onClick={handleWebPress}
    >
      {/* Background track text */}
      <Text style={[styles.text, { color: disabled ? '#94A3B8' : '#475569' }]} numberOfLines={1}>
        {swipeCompleted ? 'Completed ✓' : title}
      </Text>

      {/* Swipe handle */}
      <Animated.View
        style={[
          styles.handle,
          {
            backgroundColor: disabled ? '#CBD5E1' : color,
            transform: [{ translateX: pan.x }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.handleText}>➔</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: 4,
    width: '100%',
    // @ts-ignore
    userSelect: 'none',
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  handle: {
    position: 'absolute',
    left: 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    // @ts-ignore
    userSelect: 'none',
  },
  handleText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
});

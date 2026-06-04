import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../../constants/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export const SkeletonBlock: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity,
        },
        style,
      ]}
    />
  );
};

export const RiderHomeScreenSkeleton: React.FC = () => (
  <View style={styles.container}>
    {/* Hero Card Skeleton */}
    <View style={styles.heroCard}>
      <SkeletonBlock width={100} height={18} style={{ opacity: 0.4, marginBottom: 8 }} />
      <SkeletonBlock width={160} height={26} style={{ opacity: 0.4, marginBottom: 16 }} />
      
      {/* Online switch skeleton */}
      <View style={[styles.row, { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12, marginBottom: 16 }]}>
        <SkeletonBlock width={40} height={40} borderRadius={20} style={{ opacity: 0.3 }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonBlock width={120} height={14} style={{ opacity: 0.3, marginBottom: 6 }} />
          <SkeletonBlock width={160} height={10} style={{ opacity: 0.3 }} />
        </View>
        <SkeletonBlock width={60} height={24} borderRadius={12} style={{ opacity: 0.3 }} />
      </View>

      {/* Stats row skeleton */}
      <View style={styles.row}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBlock width={24} height={24} style={{ opacity: 0.3, marginBottom: 6 }} />
            <SkeletonBlock width={40} height={18} style={{ opacity: 0.3, marginBottom: 4 }} />
            <SkeletonBlock width={50} height={10} style={{ opacity: 0.3 }} />
          </View>
        ))}
      </View>
    </View>

    {/* Tab Bar Skeleton */}
    <View style={[styles.row, { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }]}>
      <SkeletonBlock width="45%" height={32} borderRadius={16} />
      <SkeletonBlock width="45%" height={32} borderRadius={16} />
    </View>

    {/* Group List Skeleton */}
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      {[1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <View style={[styles.row, { marginBottom: 12 }]}>
            <View style={[styles.row, { gap: 8, justifyContent: 'flex-start' }]}>
              <SkeletonBlock width={24} height={24} borderRadius={12} />
              <SkeletonBlock width={100} height={16} />
              <SkeletonBlock width={60} height={18} borderRadius={9} />
            </View>
            <SkeletonBlock width={70} height={26} borderRadius={13} />
          </View>
          
          <View style={{ gap: 8 }}>
            {[1, 2].map((j) => (
              <View key={j} style={[styles.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                <View style={{ gap: 4 }}>
                  <SkeletonBlock width={80} height={14} />
                  <SkeletonBlock width={140} height={12} />
                </View>
                <SkeletonBlock width={50} height={20} borderRadius={10} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCard: {
    backgroundColor: '#EF4444',
    padding: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  }
});

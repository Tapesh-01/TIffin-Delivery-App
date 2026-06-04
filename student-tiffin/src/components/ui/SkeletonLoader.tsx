import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export const SkeletonBlock: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = Radius.sm,
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
          backgroundColor: Colors.skeletonBase,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const HomeScreenSkeleton: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.row}>
      <View>
        <SkeletonBlock width={120} height={16} />
        <View style={{ height: 6 }} />
        <SkeletonBlock width={200} height={24} />
      </View>
      <SkeletonBlock width={44} height={44} borderRadius={22} />
    </View>
    <View style={{ height: 20 }} />
    <SkeletonBlock width="100%" height={180} borderRadius={20} />
    <View style={{ height: 20 }} />
    <SkeletonBlock width="100%" height={80} borderRadius={16} />
    <View style={{ height: 20 }} />
    <SkeletonBlock width={140} height={20} />
    <View style={{ height: 12 }} />
    {[1, 2, 3].map((i) => (
      <View key={i} style={[styles.row, { marginBottom: 12 }]}>
        <SkeletonBlock width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonBlock width="60%" height={16} />
          <View style={{ height: 6 }} />
          <SkeletonBlock width="80%" height={13} />
        </View>
      </View>
    ))}
  </View>
);

export const OrderTrackingSkeleton: React.FC = () => (
  <View style={[styles.container, { padding: 0 }]}>
    {/* Header Skeleton */}
    <View style={{ backgroundColor: '#FF6B35', height: 150, padding: 24, justifyContent: 'flex-end', gap: 10 }}>
      <SkeletonBlock width={60} height={14} style={{ opacity: 0.5 }} />
      <SkeletonBlock width="60%" height={24} style={{ opacity: 0.5 }} />
      <SkeletonBlock width="40%" height={14} style={{ opacity: 0.5 }} />
    </View>
    
    <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
      {/* Status Card Skeleton */}
      <View style={styles.card}>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <SkeletonBlock width="40%" height={18} />
          <SkeletonBlock width="25%" height={20} borderRadius={8} />
        </View>
        <SkeletonBlock width="100%" height={6} borderRadius={3} style={{ marginBottom: 20 }} />
        <View style={styles.row}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1, gap: 8 }}>
              <SkeletonBlock width={40} height={40} borderRadius={20} />
              <SkeletonBlock width="70%" height={10} />
            </View>
          ))}
        </View>
      </View>

      {/* Map Card Skeleton */}
      <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
        <View style={{ padding: 16 }}>
          <SkeletonBlock width="50%" height={18} />
        </View>
        <SkeletonBlock width="100%" height={200} borderRadius={0} />
        <View style={[styles.row, { padding: 16 }]}>
          <SkeletonBlock width="40%" height={14} />
          <SkeletonBlock width="40%" height={12} />
        </View>
      </View>

      {/* Rider Card Skeleton */}
      <View style={styles.card}>
        <SkeletonBlock width="35%" height={18} style={{ marginBottom: 16 }} />
        <View style={[styles.row, { gap: 16, justifyContent: 'flex-start' }]}>
          <SkeletonBlock width={56} height={56} borderRadius={28} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock width="50%" height={16} />
            <SkeletonBlock width="40%" height={12} />
            <SkeletonBlock width="30%" height={12} />
          </View>
          <SkeletonBlock width={44} height={44} borderRadius={22} />
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: Colors.background },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  }
});


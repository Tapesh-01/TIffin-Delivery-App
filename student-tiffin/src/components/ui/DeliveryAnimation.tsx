import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Shadows } from '../../constants/theme';

export const DeliveryAnimation: React.FC<{ size?: 'normal' | 'mini' }> = ({ size = 'normal' }) => {
  const isMini = size === 'mini';

  // Animation values
  const scooterBounce = useRef(new Animated.Value(0)).current;
  const wheelRotate = useRef(new Animated.Value(0)).current;
  
  const steam1Y = useRef(new Animated.Value(0)).current;
  const steam1Opacity = useRef(new Animated.Value(0)).current;
  
  const steam2Y = useRef(new Animated.Value(0)).current;
  const steam2Opacity = useRef(new Animated.Value(0)).current;

  const smokeX = useRef(new Animated.Value(0)).current;
  const smokeY = useRef(new Animated.Value(0)).current;
  const smokeOpacity = useRef(new Animated.Value(0)).current;
  const smokeScale = useRef(new Animated.Value(0.5)).current;

  const roadDash1 = useRef(new Animated.Value(0)).current;
  const roadDash2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Scooter Bounce (looping)
    Animated.loop(
      Animated.sequence([
        Animated.timing(scooterBounce, {
          toValue: -4,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scooterBounce, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Wheel Rotation
    Animated.loop(
      Animated.timing(wheelRotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Steam 1 Animation (rising from Tiffin)
    const animateSteam1 = () => {
      steam1Y.setValue(0);
      steam1Opacity.setValue(0.8);
      Animated.parallel([
        Animated.timing(steam1Y, {
          toValue: -20,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(steam1Opacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start(() => animateSteam1());
    };
    animateSteam1();

    // 4. Steam 2 Animation (offset start)
    const animateSteam2 = () => {
      steam2Y.setValue(0);
      steam2Opacity.setValue(0.8);
      Animated.parallel([
        Animated.timing(steam2Y, {
          toValue: -25,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(steam2Opacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]).start(() => animateSteam2());
    };
    setTimeout(() => {
      animateSteam2();
    }, 700);

    // 5. Exhaust Smoke Animation
    const animateSmoke = () => {
      smokeX.setValue(0);
      smokeY.setValue(0);
      smokeOpacity.setValue(0.7);
      smokeScale.setValue(0.4);
      Animated.parallel([
        Animated.timing(smokeX, {
          toValue: -30,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(smokeY, {
          toValue: -15,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(smokeOpacity, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(smokeScale, {
          toValue: 2.2,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start(() => animateSmoke());
    };
    animateSmoke();

    // 6. Road Dash Lines Animation
    Animated.loop(
      Animated.parallel([
        Animated.timing(roadDash1, {
          toValue: -150,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(roadDash2, {
          toValue: -150,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = wheelRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isMini) {
    return (
      <View style={styles.miniContainer}>
        <Animated.View style={[styles.miniScooter, { transform: [{ translateY: scooterBounce }] }]}>
          <Text style={{ fontSize: 28 }}>🛵</Text>
          <Animated.View style={[styles.miniSteam, { opacity: steam1Opacity, transform: [{ translateY: steam1Y }] }]} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.cardContainer}>
      <View style={styles.canvas}>
        {/* Background Clouds */}
        <View style={styles.cloud1} />
        <View style={styles.cloud2} />

        {/* Speed Lines */}
        <View style={styles.speedLine1} />
        <View style={styles.speedLine2} />

        {/* Exhaust Smoke */}
        <Animated.View
          style={[
            styles.smokeBubble,
            {
              opacity: smokeOpacity,
              transform: [
                { translateX: smokeX },
                { translateY: smokeY },
                { scale: smokeScale },
              ],
            },
          ]}
        />

        {/* The Entire Rider + Scooter Entity */}
        <Animated.View style={[styles.scooterWrapper, { transform: [{ translateY: scooterBounce }] }]}>
          {/* Tiffin Hot Steam */}
          <Animated.View
            style={[
              styles.steamLine,
              { left: 16, opacity: steam1Opacity, transform: [{ translateY: steam1Y }] },
            ]}
          />
          <Animated.View
            style={[
              styles.steamLine,
              { left: 24, opacity: steam2Opacity, transform: [{ translateY: steam2Y }] },
            ]}
          />

          {/* Steel Tiffin Container */}
          <View style={styles.tiffinBox}>
            <View style={styles.tiffinBelt} />
            <View style={styles.tiffinHandle} />
          </View>

          {/* Rider Helmet */}
          <View style={styles.riderHead}>
            <View style={styles.helmetVisor} />
            <View style={styles.helmetBody} />
          </View>
          
          {/* Rider Torso */}
          <View style={styles.riderBody} />

          {/* Scooter Chassis / Shield */}
          <View style={styles.scooterBody}>
            <View style={styles.scooterHeadlight} />
          </View>
          
          {/* Handlebar */}
          <View style={styles.handleBar} />

          {/* Wheel Back */}
          <Animated.View style={[styles.wheel, { left: 12, transform: [{ rotate: spin }] }]}>
            <View style={styles.spokeHorizontal} />
            <View style={styles.spokeVertical} />
            <View style={styles.wheelCenter} />
          </Animated.View>

          {/* Wheel Front */}
          <Animated.View style={[styles.wheel, { right: 18, transform: [{ rotate: spin }] }]}>
            <View style={styles.spokeHorizontal} />
            <View style={styles.spokeVertical} />
            <View style={styles.wheelCenter} />
          </Animated.View>

          {/* Exhaust Pipe */}
          <View style={styles.exhaustPipe} />
        </Animated.View>

        {/* Road (Static layer) */}
        <View style={styles.roadLine} />

        {/* Animated Road Dashes */}
        <View style={styles.roadDashesContainer}>
          <Animated.View
            style={[
              styles.roadDash,
              {
                transform: [
                  {
                    translateX: roadDash1.interpolate({
                      inputRange: [-150, 0],
                      outputRange: [-150, 0],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.roadDash,
              {
                left: 150,
                transform: [
                  {
                    translateX: roadDash2.interpolate({
                      inputRange: [-150, 0],
                      outputRange: [-150, 0],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.roadDash,
              {
                left: 300,
                transform: [
                  {
                    translateX: roadDash2.interpolate({
                      inputRange: [-150, 0],
                      outputRange: [-150, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </View>
      <Text style={styles.caption}>Chef is preparing fresh hot tiffins! 🧑‍🍳📦</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFF4F0',
    borderRadius: Radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE3D8',
    overflow: 'hidden',
  },
  miniContainer: {
    width: 60,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniScooter: {
    position: 'relative',
  },
  miniSteam: {
    position: 'absolute',
    top: -4,
    left: 4,
    width: 2,
    height: 6,
    backgroundColor: 'rgba(255, 69, 0, 0.4)',
    borderRadius: 1,
  },
  canvas: {
    width: '100%',
    height: 110,
    position: 'relative',
    overflow: 'hidden',
  },
  cloud1: {
    width: 50,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    position: 'absolute',
    top: 15,
    right: 30,
  },
  cloud2: {
    width: 35,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    position: 'absolute',
    top: 30,
    left: 40,
  },
  speedLine1: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255, 69, 0, 0.15)',
    position: 'absolute',
    top: 45,
    left: 10,
  },
  speedLine2: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 69, 0, 0.15)',
    position: 'absolute',
    top: 60,
    right: 15,
  },
  scooterWrapper: {
    width: 110,
    height: 70,
    position: 'absolute',
    bottom: 12,
    left: '35%',
    zIndex: 10,
  },
  scooterBody: {
    position: 'absolute',
    bottom: 14,
    left: 30,
    width: 44,
    height: 26,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 20,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 10,
  },
  scooterHeadlight: {
    position: 'absolute',
    top: 4,
    right: -2,
    width: 6,
    height: 8,
    backgroundColor: '#FFEB3B',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  handleBar: {
    position: 'absolute',
    bottom: 38,
    right: 32,
    width: 14,
    height: 4,
    backgroundColor: '#374151',
    transform: [{ rotate: '-15deg' }],
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  riderHead: {
    position: 'absolute',
    bottom: 42,
    left: 42,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B', // Yellow helmet
    zIndex: 12,
  },
  helmetVisor: {
    position: 'absolute',
    top: 3,
    right: -1,
    width: 8,
    height: 5,
    backgroundColor: '#1E293B',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  helmetBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D97706',
  },
  riderBody: {
    position: 'absolute',
    bottom: 24,
    left: 38,
    width: 16,
    height: 20,
    backgroundColor: '#1E293B', // Dark jacket
    borderRadius: 4,
  },
  tiffinBox: {
    position: 'absolute',
    bottom: 24,
    left: 8,
    width: 24,
    height: 26,
    backgroundColor: '#94A3B8', // Steel Grey Tiffin
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  tiffinBelt: {
    width: 4,
    height: '100%',
    backgroundColor: Colors.primary,
  },
  tiffinHandle: {
    position: 'absolute',
    top: -6,
    width: 14,
    height: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#475569',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  steamLine: {
    position: 'absolute',
    top: -4,
    width: 2.5,
    height: 12,
    backgroundColor: 'rgba(255, 69, 0, 0.4)',
    borderRadius: 1.5,
    zIndex: 1,
  },
  wheel: {
    position: 'absolute',
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3.5,
    borderColor: '#374151',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelCenter: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#374151',
    position: 'absolute',
  },
  spokeHorizontal: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#475569',
  },
  spokeVertical: {
    width: 1.5,
    height: '100%',
    backgroundColor: '#475569',
    position: 'absolute',
  },
  exhaustPipe: {
    position: 'absolute',
    bottom: 12,
    left: 2,
    width: 10,
    height: 4,
    backgroundColor: '#475569',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  smokeBubble: {
    position: 'absolute',
    bottom: 20,
    left: '33%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.5)',
    zIndex: 5,
  },
  roadLine: {
    width: '150%',
    height: 4,
    backgroundColor: '#E2E8F0',
    position: 'absolute',
    bottom: 10,
    left: -20,
  },
  roadDashesContainer: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    height: 4,
    flexDirection: 'row',
  },
  roadDash: {
    position: 'absolute',
    width: 24,
    height: 3,
    backgroundColor: '#CBD5E1',
    borderRadius: 1.5,
  },
  caption: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    marginTop: 10,
    textAlign: 'center',
  },
});

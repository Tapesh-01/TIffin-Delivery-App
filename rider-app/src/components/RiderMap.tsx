import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Colors } from '../constants/colors';

// Check if we can import react-native-maps (only on native)
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps.MapView;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
  } catch (e) {
    console.warn('react-native-maps could not be loaded on this platform:', e);
  }
}

interface RiderMapProps {
  riderLocation: { lat: number; lng: number } | null;
  destinationLocation: { lat: number; lng: number } | null;
  destinationName: string;
}

export const RiderMap: React.FC<RiderMapProps> = ({
  riderLocation,
  destinationLocation,
  destinationName,
}) => {
  const isWeb = Platform.OS === 'web';

  // Default coordinates (e.g. Central Delhi / Campus Area)
  const defaultLat = 28.6139;
  const defaultLng = 77.2090;

  const rLat = riderLocation?.lat || defaultLat;
  const rLng = riderLocation?.lng || defaultLng;
  const dLat = destinationLocation?.lat || rLat + 0.005; // Dummy offset if not provided
  const dLng = destinationLocation?.lng || rLng + 0.005;

  if (isWeb) {
    const hasRider = !!riderLocation;
    const hasDest = !!destinationLocation;

    const leafletHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #FAFAFA; }
          .leaflet-container { background: #FAFAFA; }
          .leaflet-tile-container {
            filter: grayscale(0.85) contrast(1.15) brightness(0.95);
          }
          .marker-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }
          .leaflet-tooltip.map-label {
            background: rgba(26, 10, 0, 0.95);
            color: #FFFFFF;
            border: 1px solid rgba(255, 69, 0, 0.5);
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 11px;
            font-family: system-ui, -apple-system, sans-serif;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            white-space: nowrap;
          }
          .leaflet-tooltip-top.map-label::before {
            border-top-color: rgba(26, 10, 0, 0.95);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map', {
            scrollWheelZoom: true,
            zoomControl: false,
            doubleClickZoom: true,
            touchZoom: true
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          var bounds = [];

          if (${hasRider}) {
            var riderIcon = L.divIcon({
              className: 'marker-icon',
              html: '🏍️',
              iconSize: [30, 30]
            });
            var riderMarker = L.marker([${rLat}, ${rLng}], { icon: riderIcon }).addTo(map);
            riderMarker.bindTooltip("You / Rider", { permanent: true, direction: 'top', className: 'map-label' });
            bounds.push([${rLat}, ${rLng}]);
          }

          if (${hasDest}) {
            var destIcon = L.divIcon({
              className: 'marker-icon',
              html: '🏢',
              iconSize: [30, 30]
            });
            var destMarker = L.marker([${dLat}, ${dLng}], { icon: destIcon }).addTo(map);
            destMarker.bindTooltip("${destinationName || 'Destination'}", { permanent: true, direction: 'top', className: 'map-label' });
            bounds.push([${dLat}, ${dLng}]);
          }

          if (${hasRider} && ${hasDest}) {
            // Realistic street bends route generator
            var midLat = ${rLat} + (${dLat} - ${rLat}) * 0.45;
            var midLng = ${rLng} + (${dLng} - ${rLng}) * 0.65;
            var routePoints = [
              [${rLat}, ${rLng}],
              [midLat, ${rLng}],
              [midLat, midLng],
              [${dLat}, ${dLng}]
            ];

            L.polyline(routePoints, {
              color: '${Colors.primary}',
              weight: 5,
              opacity: 0.9,
              dashArray: '8, 8'
            }).addTo(map);
          }

          if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50] });
          } else if (bounds.length === 1) {
            map.setView(bounds[0], 16);
          } else {
            map.setView([${rLat}, ${rLng}], 16);
          }
        </script>
      </body>
      </html>
    `;

    return (
      <View style={styles.container}>
        <iframe
          title="Rider Navigation Map"
          srcDoc={leafletHtml}
          style={{ width: '100%', height: '100%', border: 0 }}
        />
        <View style={styles.webOverlay}>
          <Text style={styles.webOverlayTitle}>🧭 Live Tracking Active</Text>
          <Text style={styles.webOverlaySubtitle}>
            Navigating to: <Text style={{ fontWeight: '700', color: Colors.primary }}>{destinationName}</Text>
          </Text>
        </View>
      </View>
    );
  }

  // Native map using react-native-maps
  if (!MapView) {
    return (
      <View style={[styles.container, styles.fallbackContainer]}>
        <Text style={styles.fallbackTxt}>📍 Map view not available on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: (rLat + dLat) / 2,
          longitude: (rLng + dLng) / 2,
          latitudeDelta: Math.abs(rLat - dLat) * 1.5 || 0.01,
          longitudeDelta: Math.abs(rLng - dLng) * 1.5 || 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Rider Marker */}
        {riderLocation && (
          <Marker
            coordinate={{ latitude: rLat, longitude: rLng }}
            title="Your Position"
            description="Moving towards destination"
          >
            <View style={styles.riderMarkerWrap}>
              <Text style={{ fontSize: 24 }}>🏍️</Text>
            </View>
          </Marker>
        )}

        {/* Destination Marker */}
        {destinationLocation && (
          <Marker
            coordinate={{ latitude: dLat, longitude: dLng }}
            title={destinationName}
            description="Delivery Location"
          >
            <View style={styles.destinationMarkerWrap}>
              <Text style={{ fontSize: 24 }}>🏢</Text>
            </View>
          </Marker>
        )}

        {/* Polyline Route */}
        {riderLocation && destinationLocation && (
          <Polyline
            coordinates={[
              { latitude: rLat, longitude: rLng },
              { latitude: rLat + (dLat - rLat) * 0.45, longitude: rLng },
              { latitude: rLat + (dLat - rLat) * 0.45, longitude: rLng + (dLng - rLng) * 0.65 },
              { latitude: dLat, longitude: dLng },
            ]}
            strokeColor={Colors.primary}
            strokeWidth={5}
            lineDashPattern={[8, 8]}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackTxt: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  riderMarkerWrap: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  destinationMarkerWrap: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F97316',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  webOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  webOverlayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  webOverlaySubtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
});

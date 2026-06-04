import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
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

// Retro Silver-Grey Premium map style for native MapView
const retroMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] }
];

interface CustomerMapProps {
  driverLocation: { lat: number; lng: number } | null;
  destinationLocation: { lat: number; lng: number } | null;
  destinationName: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export const CustomerMap: React.FC<CustomerMapProps> = ({
  driverLocation,
  destinationLocation,
  destinationName,
  onLocationSelect,
  interactive = false,
}) => {
  const [zoom, setZoom] = useState(16);
  const isWeb = Platform.OS === 'web';

  const defaultLat = 28.6139;
  const defaultLng = 77.2090;

  const dLat = destinationLocation?.lat || defaultLat;
  const dLng = destinationLocation?.lng || defaultLng;
  const rLat = driverLocation?.lat || dLat - 0.005; // Rider position
  const rLng = driverLocation?.lng || dLng - 0.005;

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'location_selected') {
          if (interactive && onLocationSelect) {
            onLocationSelect(event.data.lat, event.data.lng);
          }
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [interactive, onLocationSelect]);

  const PulseDot = () => (
    <View style={styles.pulseContainer}>
      <View style={styles.pulseDot} />
      <View style={styles.pulseRing} />
    </View>
  );

  if (isWeb) {
    const hasRider = !!driverLocation;
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

          var destIcon = L.divIcon({
            className: 'marker-icon',
            html: '📍',
            iconSize: [30, 30]
          });

          var destMarker;
          if (${interactive}) {
            destMarker = L.marker([${dLat}, ${dLng}], {
              icon: destIcon,
              draggable: true
            }).addTo(map);
            destMarker.bindTooltip("${destinationName || 'Selected Location'}", { permanent: true, direction: 'top', className: 'map-label' });

            function updateCoords(lat, lng) {
              window.parent.postMessage({ type: 'location_selected', lat: lat, lng: lng }, '*');
            }

            map.on('click', function(e) {
              destMarker.setLatLng(e.latlng);
              updateCoords(e.latlng.lat, e.latlng.lng);
            });

            destMarker.on('dragend', function(e) {
              var pos = destMarker.getLatLng();
              updateCoords(pos.lat, pos.lng);
            });
          } else {
            destMarker = L.marker([${dLat}, ${dLng}], { icon: destIcon }).addTo(map);
            destMarker.bindTooltip("${destinationName || 'My Location'}", { permanent: true, direction: 'top', className: 'map-label' });
          }

          if (${hasRider}) {
            var riderIcon = L.divIcon({
              className: 'marker-icon',
              html: '🏍️',
              iconSize: [30, 30]
            });
            var riderMarker = L.marker([${rLat}, ${rLng}], { icon: riderIcon }).addTo(map);
            riderMarker.bindTooltip("Delivery Partner", { permanent: true, direction: 'top', className: 'map-label' });

            L.polyline([[${rLat}, ${rLng}], [${dLat}, ${dLng}]], {
              color: '${Colors.primary}',
              weight: 4,
              dashArray: '6, 6'
            }).addTo(map);

            map.fitBounds([[${rLat}, ${rLng}], [${dLat}, ${dLng}]], { padding: [50, 50] });
          } else {
            map.setView([${dLat}, ${dLng}], 16);
          }
        </script>
      </body>
      </html>
    `;

    return (
      <View style={styles.container}>
        <iframe
          title="Tiffin Tracking Map"
          srcDoc={leafletHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 0,
          }}
        />

        {/* Zomato-style dark overlay */}
        {!interactive ? (
          <View style={styles.webOverlay}>
            <View style={styles.overlayHeader}>
              <PulseDot />
              <Text style={styles.webOverlayTitle}>LIVE TRACKING ACTIVE</Text>
            </View>
            <Text style={styles.webOverlaySubtitle}>
              Tiffin delivering to:{' '}
              <Text style={{ fontWeight: 'bold', color: Colors.primaryLight }}>{destinationName}</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.interactiveWebHint}>
            <Text style={styles.interactiveWebHintTxt}>
              📍 Tap map or drag marker to set your precise location. (Scroll cursor or pinch to zoom)
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Native maps
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
        customMapStyle={retroMapStyle}
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        onPress={(e: any) => {
          if (interactive && onLocationSelect) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            onLocationSelect(latitude, longitude);
          }
        }}
        initialRegion={interactive ? {
          latitude: dLat,
          longitude: dLng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        } : {
          latitude: (rLat + dLat) / 2,
          longitude: (rLng + dLng) / 2,
          latitudeDelta: Math.abs(rLat - dLat) * 1.5 || 0.01,
          longitudeDelta: Math.abs(rLng - dLng) * 1.5 || 0.01,
        }}
      >
        {/* Destination Marker */}
        <Marker
          coordinate={{ latitude: dLat, longitude: dLng }}
          title={interactive ? "Your Custom Location" : "Your Hostel"}
          description={destinationName}
          draggable={interactive}
          onDragEnd={(e: any) => {
            if (interactive && onLocationSelect) {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onLocationSelect(latitude, longitude);
            }
          }}
        >
          <View style={styles.destinationMarkerWrap}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </View>
        </Marker>

        {/* Rider Marker */}
        {driverLocation && (
          <Marker
            coordinate={{ latitude: rLat, longitude: rLng }}
            title="Delivery Partner"
            description="Tiffin is on the way!"
          >
            <View style={styles.riderMarkerWrap}>
              <Text style={{ fontSize: 20 }}>🏍️</Text>
              <View style={styles.markerPulseRing} />
            </View>
          </Marker>
        )}

        {/* Polyline Route - Premium dotted/dashed-like line */}
        {driverLocation && (
          <Polyline
            coordinates={[
              { latitude: rLat, longitude: rLng },
              { latitude: dLat, longitude: dLng },
            ]}
            strokeColor={Colors.primary}
            strokeWidth={4.5}
            lineDashPattern={[6, 6]}
          />
        )}
      </MapView>

      {/* Floating native HUD */}
      {!interactive ? (
        <View style={[styles.webOverlay, { bottom: 16, left: 16, right: 16 }]}>
          <View style={styles.overlayHeader}>
            <PulseDot />
            <Text style={styles.webOverlayTitle}>LIVE TRACKING ACTIVE</Text>
          </View>
          <Text style={styles.webOverlaySubtitle}>
            Delivering to:{' '}
            <Text style={{ fontWeight: 'bold', color: Colors.primaryLight }}>{destinationName}</Text>
          </Text>
        </View>
      ) : (
        <View style={styles.interactiveWebHint}>
          <Text style={styles.interactiveWebHintTxt}>
            📍 Tap map or drag marker to set your precise location.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    position: 'relative',
    backgroundColor: '#FAFAFA',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackTxt: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  riderMarkerWrap: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  markerPulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 69, 0, 0.4)',
  },
  destinationMarkerWrap: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Zomato-Style Glassmorphism Dark Panel
  webOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(26, 10, 0, 0.95)', // Sleek deep dark orange/black background
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.25)', // Premium brand colored accent border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  webOverlayTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2ECC71', // Live green status
    letterSpacing: 1.2,
  },
  webOverlaySubtitle: {
    fontSize: 13,
    color: '#EFEFEF',
    marginTop: 2,
  },
  // Radar Pulse styles
  pulseContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2ECC71',
    position: 'absolute',
    zIndex: 2,
  },
  pulseRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(46, 204, 113, 0.45)',
    position: 'absolute',
    zIndex: 1,
  },
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 4,
    zIndex: 10000,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  interactiveWebHint: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    zIndex: 10000,
  },
  interactiveWebHintTxt: {
    color: '#FAFAFA',
    fontSize: 10.5,
    textAlign: 'center',
    fontWeight: '500',
  },
});

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapboxViewProps {
  latitude: number;
  longitude: number;
  zoom: number;
  style?: object;
}

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1Ijoic21hZmZlbyIsImEiOiJjbTN4ZzJkc2EwcXRoMndvZnp1YnF0MWpoIn0.XsrA1MQ32d9le4UpWWoVyw";

const MapboxView: React.FC<MapboxViewProps> = ({ latitude, longitude, zoom, style }) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const updateMap = `
      if (map) {
        map.setCenter([${longitude}, ${latitude}]);
        map.setZoom(${zoom});
      }
    `;
    webViewRef.current?.injectJavaScript(updateMap);
  }, [latitude, longitude, zoom]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <script src='https://api.mapbox.com/mapbox-gl-js/v2.9.1/mapbox-gl.js'></script>
      <link href='https://api.mapbox.com/mapbox-gl-js/v2.9.1/mapbox-gl.css' rel='stylesheet' />
      <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
        var map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [${longitude}, ${latitude}],
          zoom: ${zoom}
        });
        var marker = new mapboxgl.Marker()
          .setLngLat([${longitude}, ${latitude}])
          .addTo(map);
      </script>
    </body>
    </html>
  `;

  return (
      <View style={[styles.container, style]}>
        <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.map}
        />
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapboxView;


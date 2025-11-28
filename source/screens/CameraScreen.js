import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PRIMARY_COLOR = '#6AA84F';
const ACCENT_COLOR = '#FFFFFF';

/**
 * CameraScreen component handles camera access, permission requests,
 * taking photos, and navigating to the analysis screen with the photo URI.
 */
export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        console.log('ImagePicker camera permission:', status);
        setHasPermission(status === 'granted');
      } catch (err) {
        console.error('Error requesting camera permission:', err);
        setHasPermission(false);
      }
    })();
  }, []);

  const openSystemCamera = async () => {
    if (hasPermission === false) {
      return alert('Permiso de cámara denegado. Activa el permiso en la configuración del dispositivo.');
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
        base64: false,
      });

      if (!result.cancelled) {
        console.log('Foto tomada:', result.uri);
        setPhotoUri(result.uri);
        // Navega a Analysis (asegúrate que la ruta exista en tu stack)
        navigation.navigate('Analysis', { photoUri: result.uri });
      } else {
        console.log('Usuario canceló la cámara');
      }
    } catch (err) {
      console.error('Error al abrir la cámara del sistema:', err);
      alert('No se pudo abrir la cámara. Revisa permisos y vuelve a intentar.');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.statusText}>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionDeniedContainer}>
        <MaterialCommunityIcons name="camera-off" size={48} color="#D32F2F" />
        <Text style={styles.permissionDeniedTitle}>Permiso denegado</Text>
        <Text style={styles.permissionDeniedText}>Activa el permiso de cámara en la configuración del dispositivo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={ACCENT_COLOR} />
          <Text style={styles.loadingText}>Abriendo cámara...</Text>
        </View>
      )}

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <View style={styles.previewPlaceholder}>
          <MaterialCommunityIcons name="camera" size={72} color="#999" />
          <Text style={styles.previewText}>Presiona el botón para abrir la cámara</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.captureButton}
        onPress={openSystemCamera}
        disabled={loading}
      >
        <MaterialCommunityIcons name="camera-outline" size={28} color={PRIMARY_COLOR} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', padding: 16 },
  statusText: { marginTop: 10, fontSize: 16, color: PRIMARY_COLOR },
  permissionDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFF8F8' },
  permissionDeniedTitle: { fontSize: 22, fontWeight: 'bold', color: '#D32F2F', marginTop: 10 },
  permissionDeniedText: { fontSize: 16, textAlign: 'center', marginTop: 10, color: '#666' },
  preview: { width: '100%', height: '60%', borderRadius: 8, marginBottom: 20 },
  previewPlaceholder: { width: '100%', height: '60%', borderRadius: 8, borderWidth: 1, borderColor: '#EEE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  previewText: { color: '#777', marginTop: 10 },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: ACCENT_COLOR, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: PRIMARY_COLOR + '44', elevation: 3 },
  loadingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: ACCENT_COLOR, marginTop: 10 }
});
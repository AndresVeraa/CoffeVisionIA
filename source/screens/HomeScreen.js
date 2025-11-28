// source/screens/HomeScreen.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  // Abrir cámara nativa
  const handleTakePhoto = async () => {
    setLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesitan permisos de la cámara para tomar una foto.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        // usar photoUri para consistencia
        navigation.navigate('Analysis', { photoUri: imageUri });
      }
    } catch (err) {
      console.error('Error al abrir la cámara:', err);
      Alert.alert('Error', 'No se pudo abrir la cámara. Revisa permisos e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Abrir galería nativa
  const handleSelectFromGallery = async () => {
    setLoading(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesitan permisos de galería para seleccionar una imagen.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        // usar photoUri para consistencia
        navigation.navigate('Analysis', { photoUri: imageUri });
      }
    } catch (err) {
      console.error('Error al abrir la galería:', err);
      Alert.alert('Error', 'No se pudo abrir la galería. Revisa permisos e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.appName}>AgroScan IA</Text>
        <Text style={styles.tagline}>Detección temprana de Roya del Café</Text>
      </View>

      {/* Área de la Foto Actual o Placeholder */}
      <View style={styles.imagePlaceholder}>
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.image} />
        ) : (
          <TouchableOpacity
            style={styles.iconBackground}
            onPress={handleTakePhoto}
            activeOpacity={0.8}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Abrir cámara"
          >
            {loading ? (
              <ActivityIndicator size="large" color="#38761D" />
            ) : (
              <>
                <MaterialCommunityIcons name="camera-plus" size={80} color="#38761D" />
                <Text style={styles.placeholderText}>Toca para comenzar el análisis</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Botones de Acción */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, loading && { opacity: 0.6 }]}
          onPress={handleTakePhoto}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" style={{ marginRight: 10 }} />
          ) : (
            <MaterialCommunityIcons name="camera" size={24} color="#FFF" />
          )}
          <Text style={styles.buttonText}>Tomar Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonSecondary, loading && { opacity: 0.6 }]}
          onPress={handleSelectFromGallery}
          disabled={loading}
        >
          <MaterialCommunityIcons name="image-multiple" size={24} color="#38761D" />
          <Text style={styles.buttonTextSecondary}>Galería</Text>
        </TouchableOpacity>
      </View>

      {/* Información */}
      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#1E90FF" />
        <Text style={styles.infoText}>
          Esta herramienta simula la detección de Hemileia vastatrix (Roya del Café) usando visión artificial. 
        </Text>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  header: { paddingHorizontal: 20, marginBottom: 20, alignItems: 'center' },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#38761D' },
  tagline: { fontSize: 16, color: '#666', marginTop: 5 },

  imagePlaceholder: {
    width: width * 0.9,
    height: width * 0.9 * (4 / 3), 
    alignSelf: 'center',
    marginBottom: 30,
    borderRadius: 15,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C8E6C9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  iconBackground: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { marginTop: 10, fontSize: 16, color: '#333' },

  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 20, marginBottom: 30 },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#38761D', 
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38761D',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  buttonTextSecondary: { color: '#38761D', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: '#E6F7FF',
    borderRadius: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#1E90FF',
  },
  infoText: { fontSize: 14, color: '#333', marginLeft: 10, flexShrink: 1 },
});

export default HomeScreen;
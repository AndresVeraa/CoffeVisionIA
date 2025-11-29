// source/screens/CameraScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Modal, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PRIMARY_COLOR = '#4CAF50'; // Verde de café
const ACCENT_COLOR = '#FFFFFF';
const DANGER_COLOR = '#D32F2F';

const { height } = Dimensions.get('window');

/**
 * CameraScreen component handles camera access, permission requests,
 * taking photos, and navigating to the analysis screen with the photo URI.
 */
export default function CameraScreen() {
    const [hasPermission, setHasPermission] = useState(null);
    const [loading, setLoading] = useState(false);
    const [photoUri, setPhotoUri] = useState(null);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigation = useNavigation();

    useEffect(() => {
        (async () => {
            try {
                // Solicitar permisos de cámara
                const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
                
                // Solicitar permisos de galería (para openImageGallery)
                const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

                const isGranted = cameraStatus === 'granted' && mediaStatus === 'granted';
                setHasPermission(isGranted);
            } catch (err) {
                console.error('Error solicitando permisos:', err);
                setHasPermission(false);
            }
        })();
    }, []);

    const showError = (message) => {
        setErrorMessage(message);
        setErrorModalVisible(true);
    };

    /**
     * Función genérica para manejar la navegación a la pantalla de análisis.
     * @param {string} uri - URI de la imagen capturada o seleccionada.
     */
    const navigateToAnalysis = (uri) => {
        setPhotoUri(uri);
        // CORRECCIÓN CLAVE: Usamos 'imageUri' para que AnalysisScreen lo reconozca.
        navigation.navigate('Analysis', { imageUri: uri });
    };

    // --- 1. ABRIR CÁMARA ---
    const openSystemCamera = async () => {
        if (hasPermission === false) {
            return showError('Permiso de cámara denegado. Activa el permiso en la configuración del dispositivo.');
        }

        setLoading(true);
        try {
            const result = await ImagePicker.launchCameraAsync({
                quality: 0.7,
                allowsEditing: false,
                base64: false,
                mediaTypes: ImagePicker.MediaType.Images, // Evita la advertencia de depreciación
            });

            if (!result.canceled) {
                // CORRECCIÓN: Usar la estructura moderna 'assets' de Expo ImagePicker.
                const uri = result.assets?.[0]?.uri;
                if (uri) {
                    navigateToAnalysis(uri);
                } else {
                    showError('No se pudo obtener la URI de la foto capturada.');
                }
            } else {
                console.log('Usuario canceló la cámara');
                // Si cancela, volvemos a Home para no quedarnos en la pantalla de preview vacía
                navigation.navigate('Home'); 
            }
        } catch (err) {
            console.error('Error al abrir la cámara del sistema:', err);
            showError('No se pudo abrir la cámara. Revisa permisos y vuelve a intentar.');
        } finally {
            setLoading(false);
        }
    };


    // --- 2. ABRIR GALERÍA ---
    const openImageGallery = async () => {
        if (hasPermission === false) {
            return showError('Permiso de galería denegado. Activa el permiso en la configuración del dispositivo.');
        }

        setLoading(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaType.Images, // Evita la advertencia de depreciación
                quality: 0.7,
                allowsEditing: false,
                base64: false,
            });

            if (!result.canceled) {
                // CORRECCIÓN: Usar la estructura moderna 'assets' de Expo ImagePicker.
                const uri = result.assets?.[0]?.uri; 
                if (uri) {
                    navigateToAnalysis(uri);
                } else {
                    showError('No se pudo obtener la URI de la imagen seleccionada.');
                }
            } else {
                console.log('Usuario canceló la galería');
            }
        } catch (err) {
            console.error('Error al abrir la galería:', err);
            showError('No se pudo abrir la galería. Revisa permisos y vuelve a intentar.');
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            // 1. Seleccionar imagen de galería
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaType.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                let imageUri = result.assets[0].uri;
                
                // 2. Si es una URI de contenido (galería), copiarla a un directorio accesible
                if (imageUri.startsWith('content://')) {
                    console.log("Detectada URI de galería. Normalizando...");
                    
                    // Crear nombre único para el archivo
                    const filename = `diagnosis_${Date.now()}.jpg`;
                    const newPath = `${FileSystem.documentDirectory}${filename}`;
                    
                    try {
                        // Copiar archivo de galería al directorio de documentos (accesible por FileSystem)
                        await FileSystem.copyAsync({
                            from: imageUri,
                            to: newPath,
                        });
                        imageUri = newPath; // Usar la nueva URI
                        console.log("Imagen copiada exitosamente a:", imageUri);
                    } catch (copyError) {
                        console.error("Error al copiar imagen:", copyError);
                        Alert.alert("Error", "No se pudo procesar la imagen seleccionada.");
                        return;
                    }
                }

                // 3. Validar que el archivo existe antes de navegar
                try {
                  const fileInfo = await FileSystem.getInfoAsync(imageUri);
                  if (!fileInfo.exists) {
                    throw new Error("El archivo no existe en la ruta especificada.");
                  }
                  console.log("Archivo validado. Enviando a Análisis...");
                } catch (validationError) {
                  console.error("Validación de archivo fallida:", validationError);
                  Alert.alert("Error", "La imagen no se puede acceder correctamente.");
                  return;
                }

                // 4. Navegar a AnalysisScreen con la URI normalizada
                navigation.navigate('Analysis', { photoUri: imageUri });
            }
        } catch (error) {
            console.error("Error al seleccionar imagen:", error);
            Alert.alert("Error", "No se pudo seleccionar la imagen de la galería.");
        }
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={styles.statusText}>Solicitando permisos...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.permissionDeniedContainer}>
                <MaterialCommunityIcons name="camera-off" size={48} color={DANGER_COLOR} />
                <Text style={styles.permissionDeniedTitle}>Permisos denegados</Text>
                <Text style={styles.permissionDeniedText}>Activa los permisos de cámara y galería en la configuración del dispositivo para poder analizar tus cultivos.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Modal de Error (Reemplaza alert()) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={errorModalVisible}
                onRequestClose={() => setErrorModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <MaterialCommunityIcons name="alert-circle" size={30} color={DANGER_COLOR} />
                        <Text style={styles.modalTextTitle}>Error</Text>
                        <Text style={styles.modalText}>{errorMessage}</Text>
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: DANGER_COLOR }]}
                            onPress={() => setErrorModalVisible(false)}
                        >
                            <Text style={styles.buttonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={ACCENT_COLOR} />
                    <Text style={styles.loadingText}>Abriendo cámara...</Text>
                </View>
            )}

            <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                    Selecciona el método de captura para iniciar el diagnóstico.
                </Text>
                <MaterialCommunityIcons name="arrow-down" size={24} color={PRIMARY_COLOR} />
            </View>
            
            <View style={styles.previewPlaceholder}>
                <MaterialCommunityIcons name="leaf" size={72} color="#999" />
                <Text style={styles.previewText}>Diagnóstico de Roya del Café</Text>
            </View>

            <View style={styles.buttonRow}>
                 {/* Botón Galería */}
                <TouchableOpacity
                    style={[styles.captureButton, { backgroundColor: '#F0F0F0', borderWidth: 2, borderColor: PRIMARY_COLOR, marginRight: 20 }]}
                    onPress={openImageGallery}
                    disabled={loading}
                >
                    <MaterialCommunityIcons name="image-multiple-outline" size={32} color={PRIMARY_COLOR} />
                </TouchableOpacity>

                {/* Botón Cámara */}
                <TouchableOpacity
                    style={styles.captureButton}
                    onPress={openSystemCamera}
                    disabled={loading}
                >
                    <MaterialCommunityIcons name="camera-outline" size={32} color={ACCENT_COLOR} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', padding: 16 },
    statusText: { marginTop: 10, fontSize: 16, color: PRIMARY_COLOR },
    
    // Contenedores de Permiso Denegado
    permissionDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFF8F8' },
    permissionDeniedTitle: { fontSize: 22, fontWeight: 'bold', color: DANGER_COLOR, marginTop: 10 },
    permissionDeniedText: { fontSize: 16, textAlign: 'center', marginTop: 10, color: '#666' },

    // Placeholder e Instrucciones
    instructionContainer: { marginBottom: 20, alignItems: 'center' },
    instructionText: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 10 },
    previewPlaceholder: { 
        width: '100%', 
        height: height * 0.45, 
        borderRadius: 15, 
        borderWidth: 2, 
        borderColor: PRIMARY_COLOR, 
        borderStyle: 'dashed',
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 30,
        backgroundColor: '#EFFFFF'
    },
    previewText: { color: '#777', marginTop: 10 },
    
    // Botones de Captura
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: { 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        backgroundColor: PRIMARY_COLOR, 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 5, 
        borderColor: PRIMARY_COLOR + '66', // Borde semitransparente
        elevation: 5,
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    
    // Capa de Carga
    loadingOverlay: { 
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        justifyContent: 'center', 
        alignItems: 'center',
        zIndex: 100 
    },
    loadingText: { color: ACCENT_COLOR, marginTop: 10 },

    // Estilos de Modal (Reemplaza alert())
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 15,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTextTitle: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 18,
        fontWeight: 'bold',
        color: DANGER_COLOR
    },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
        color: '#333'
    },
    modalButton: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        minWidth: 100,
    },
    buttonText: {
        color: ACCENT_COLOR,
        fontWeight: "bold",
        textAlign: "center"
    }
});
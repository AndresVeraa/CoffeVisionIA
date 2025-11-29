// source/screens/DiagnosisScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
// Se importan las funciones adaptadas para SQLite
import { subscribeToDiagnosisRecords, deleteDiagnosis, initializeFirebase } from '../db/database'; 
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native'; // Hook para refrescar al enfocar

// --- Constantes y Estilos ---
const PRIMARY_COLOR = '#6AA84F'; // Verde (Success)
const ACCENT_COLOR = '#D32F2F'; // Rojo (Danger/Grave)
const CARD_BG = '#FFFFFF';

// Colores definidos para la pantalla (usando el mismo esquema que el componente Analysis)
const COLORS = {
    primary: PRIMARY_COLOR,
    secondary: '#795548', // Café
    background: '#f5f5f5',
    text: '#333333',
    success: PRIMARY_COLOR,
    danger: ACCENT_COLOR,
    warning: '#FF9800', // Naranja para Moderado
    lightGray: '#DDDDDD',
};

// Estilos consolidados
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    headerContainer: {
        backgroundColor: PRIMARY_COLOR,
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4
    },
    headerRow: { // Nuevo estilo para alinear título y botón
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        // marginBottom: 5 // Eliminado para usar headerRow
    },
    refreshButton: {
        padding: 8,
        borderRadius: 50,
        backgroundColor: PRIMARY_COLOR,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    recordCount: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8
    },
    listContent: {
        padding: 16,
        paddingBottom: 30
    },
    card: {
        flexDirection: 'row',
        backgroundColor: CARD_BG,
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imageContainer: {
        width: 90,
        height: 120,
        backgroundColor: '#f0f0f0'
    },
    thumbnail: {
        width: '100%',
        height: '100%'
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8'
    },
    content: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 6,
        flex: 1
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    infoText: {
        fontSize: 13,
        color: '#666',
        marginLeft: 6,
        flex: 1
    },
    dateText: {
        fontSize: 12,
        color: '#999',
        marginLeft: 6
    },
    treatmentPreview: {
        fontSize: 11,
        color: '#888',
        marginTop: 6,
        fontStyle: 'italic'
    },
    deleteButton: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: '#FFEBEE' // Fondo de color suave para el botón de eliminar
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginTop: 16
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: { 
        marginTop: 10, 
        color: COLORS.secondary 
    },
    // Estilo para el botón en caso de estar vacío
    button: {
        backgroundColor: PRIMARY_COLOR,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});

export default function DiagnosisScreen({ navigation }) {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState(null); // Mantener por convención
    const [refreshKey, setRefreshKey] = useState(0); // Estado para forzar recarga
    const isFocused = useIsFocused(); // Para recargar al volver a la pestaña

    // Función que contiene toda la lógica de carga de datos
    const loadRecords = async () => {
        let unsubscribe = () => {};
        setIsLoading(true);
        
        try {
            // Initialize DB and get user ID
            const currentUserId = await initializeFirebase();
            setUserId(currentUserId);
            
            // Suscribirse a cambios en la base de datos (o fetch inicial para SQLite)
            unsubscribe = subscribeToDiagnosisRecords(rows => {
                console.log('[DiagnosisScreen] Registros recibidos (SQLite).', rows.length);
                
                // Procesar los datos para extraer la lista de tratamientos (guardada en el campo 'notes')
                const processedRows = rows.map(item => {
                     let treatment = [];
                     // El campo 'notes' se usa para guardar la cadena de recomendaciones
                     if (item.notes && item.notes.startsWith('Recomendaciones:')) {
                        // Extraer solo las líneas de recomendaciones
                        treatment = item.notes.split('\n').filter(line => line.startsWith('- ')).map(line => line.substring(2).trim());
                     }
                     
                     return { 
                         ...item, 
                         treatment: treatment, 
                         // Mapear image_uri y timestamp para consistencia
                         image_uri: item.imageUri || item.image_uri, // Usar image_uri para el renderItem
                         timestamp: item.date || item.timestamp // Usar 'date' o 'timestamp' (la DB SQLite usa 'date')
                     };
                });
                
                setRecords(processedRows);
                setIsLoading(false);
            });
            
        } catch (error) {
            console.error("Error al cargar diagnósticos:", error);
            setIsLoading(false);
        }
        return unsubscribe;
    };

    // useEffect se ejecuta al montar y cuando el refreshKey o el enfoque cambian
    useEffect(() => {
        let unsubscribe = () => {};

        // Recarga automática al entrar a la pantalla o al cambiar el refreshKey
        if (isFocused) {
            loadRecords().then(unsub => {
                unsubscribe = unsub;
            });
        }
        
        // Cleanup al desmontar
        return () => unsubscribe();
    }, [isFocused, refreshKey]); // Depende del enfoque y del refreshKey


    const handleDelete = (id) => {
        // Alerta para confirmar la eliminación
        Alert.alert(
            'Confirmar eliminación',
            '¿Estás seguro de que deseas eliminar este diagnóstico?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Llama a la función de la DB para eliminar el registro
                            await deleteDiagnosis(id);
                            // Forzamos una recarga inmediata del FlatList
                            setRefreshKey(prev => prev + 1); 
                        } catch (e) {
                            console.error('[DiagnosisScreen] Error al eliminar:', e);
                            Alert.alert('Error', 'No se pudo eliminar el diagnóstico.');
                        }
                    }
                }
            ]
        );
    };

    // Función para el botón de refrescar (actualiza el estado para disparar el useEffect)
    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleViewDetail = (item) => {
        // Navegar a la pantalla de detalles (DiagnosisDetail)
        if (navigation?.navigate) {
            // Pasamos el registro procesado (con la lista de treatment)
            navigation.navigate('DiagnosisDetail', { record: item }); 
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Grave': return ACCENT_COLOR;
            case 'Moderado': return COLORS.warning;
            case 'Leve':
            case 'Sano': return PRIMARY_COLOR;
            default: return '#666';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Fecha desconocida';
        try {
            // Usamos item.timestamp del mapeo de DB, que es un ISO string
            const date = new Date(dateString); 
            return date.toLocaleString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Fecha inválida';
        }
    };

    const renderItem = ({ item }) => {
        const statusColor = getStatusColor(item.status);
        
        return (
            <TouchableOpacity 
                style={[styles.card, { borderLeftColor: statusColor }]} // Color dinámico en el borde
                onPress={() => handleViewDetail(item)}
                activeOpacity={0.7}
            >
                {/* Thumbnail de la imagen */}
                <View style={styles.imageContainer}>
                    {item.image_uri ? (
                        <Image
                            // SQLite solo almacena URI locales
                            source={{ uri: item.image_uri }} 
                            style={styles.thumbnail}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons name="image-off" size={32} color="#ccc" />
                        </View>
                    )}
                </View>

                {/* Contenido principal */}
                <View style={styles.content}>
                    {/* Header con ícono */}
                    <View style={styles.header}>
                        <MaterialCommunityIcons 
                            name="clipboard-check-outline" 
                            size={20} 
                            color={PRIMARY_COLOR} 
                        />
                        <Text style={styles.title} numberOfLines={1}>
                            {item.issue || 'Diagnóstico '}
                        </Text>
                    </View>

                    {/* Información del cultivo */}
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="spa" size={14} color="#666" />
                        <Text style={styles.infoText} numberOfLines={1}>
                            {item.plant_name || 'Café'}
                        </Text>
                    </View>

                    {/* Estado con color dinámico */}
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="alert-circle" size={14} color={statusColor} />
                        <Text style={[styles.infoText, { color: statusColor, fontWeight: '600' }]}>
                            {item.status || 'Estado desconocido'}
                        </Text>
                    </View>

                    {/* Fecha */}
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="calendar" size={14} color="#999" />
                        <Text style={styles.dateText}>
                            {formatDate(item.timestamp)} {/* Usamos timestamp, el campo mapeado de SQLite */}
                        </Text>
                    </View>

                    {/* Preview del tratamiento (desde el campo treatment procesado en useEffect) */}
                    {item.treatment && item.treatment.length > 0 && (
                        <Text style={styles.treatmentPreview} numberOfLines={2}>
                            • {item.treatment[0]}
                        </Text>
                    )}
                </View>

                {/* Botón de eliminar */}
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons name="delete-outline" size={22} color={ACCENT_COLOR} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando historial...</Text>
            </View>
        );
    }
    
    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.screenTitle}>Diagnósticos</Text>
                    
                    {/* Botón de Refrescar (Nuevo) */}
                    <TouchableOpacity 
                        style={styles.refreshButton}
                        onPress={handleRefresh}
                        disabled={isLoading}
                    >
                        <Ionicons name="reload" size={15} color="blue" />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.recordCount}>
                    {records.length} {records.length === 1 ? 'registro' : 'registros'}
                </Text>
            </View>

            <FlatList
                data={records}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="file-hidden" size={64} color="#ccc" />
                        <Text style={styles.emptyTitle}>No hay diagnósticos guardados</Text>
                        <Text style={styles.emptySubtitle}>
                            Toma una foto y guarda tu primer análisis
                        </Text>
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: PRIMARY_COLOR, padding: 10, marginTop: 20 }]}
                            onPress={() => navigation.navigate('Camera')}
                        >
                             <Ionicons name="camera" size={20} color="white" />
                             <Text style={styles.buttonText}>Comenzar Análisis</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

const buttonStyles = StyleSheet.create({ // Estilos para el botón de 'Comenzar Análisis'
    button: {
        backgroundColor: PRIMARY_COLOR,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});
// Fusionar estilos adicionales si es necesario (para el botón en ListEmptyComponent)
Object.assign(styles, buttonStyles);
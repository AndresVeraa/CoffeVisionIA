// source/screens/DiagnosisScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
// Se importan las funciones adaptadas para SQLite
import { subscribeToDiagnosisRecords, initializeFirebase } from '../db/database'; 
import DiagnosisCard from '../components/DiagnosisCard'; // Asumo que este componente existe
import { Ionicons } from '@expo/vector-icons';

// --- Constantes y Estilos ---
const COLORS = {
    primary: '#4CAF50', // Verde café
    secondary: '#795548', // Café
    background: '#F5F5F5',
    text: '#333333',
    success: '#8BC34A',
    danger: '#F44336',
    warning: '#FFC107',
    lightGray: '#DDDDDD',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.secondary,
        padding: 20,
        paddingBottom: 10,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    emptyText: {
        fontSize: 18,
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 10,
    },
    userIdText: {
        fontSize: 12,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    listContent: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    cardContainer: {
        // Estilos para el contenedor de la tarjeta (si es necesario)
    },
    // Estilo para el botón en caso de estar vacío
    button: {
        backgroundColor: COLORS.primary,
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
    const [diagnostics, setDiagnostics] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    // Nota: El useEffect idealmente usaría useFocusEffect para refrescar los datos 
    // cada vez que la pantalla se enfoca, ya que SQLite no tiene listeners en tiempo real.
    useEffect(() => {
        let unsubscribe = () => {};

        const setup = async () => {
            try {
                // initializeFirebase ahora llama a initDB de SQLite y retorna un ID local
                const currentUserId = await initializeFirebase();
                setUserId(currentUserId);
                
                // subscribeToDiagnosisRecords ahora hace un fetchDiagnoses de SQLite
                unsubscribe = subscribeToDiagnosisRecords((records) => {
                    console.log(`[DiagnosisScreen] ${records.length} registros recibidos (SQLite).`);
                    setDiagnostics(records);
                    setIsLoading(false);
                });
                
            } catch (error) {
                console.error("Error al cargar diagnósticos:", error);
                setIsLoading(false);
            }
        };

        setup();

        // Limpiar la "suscripción" (que en SQLite es una función dummy) al desmontar el componente
        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }) => {
        // Redirigir a la pantalla de detalle al presionar la tarjeta
        const navigateToDetail = () => {
            navigation.navigate('DiagnosisDetail', { record: item });
        };

        // El componente DiagnosisCard debe ser implementado en source/components/DiagnosisCard.js
        return (
            <TouchableOpacity onPress={navigateToDetail} style={styles.cardContainer}>
                {/* DiagnosisCard debe recibir el objeto completo 'item' y usar 'item.imageUri', 
                  'item.result', 'item.timestamp' para mostrar un resumen.
                */}
                <DiagnosisCard record={item} />
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 10, color: COLORS.secondary }}>Cargando historial...</Text>
            </View>
        );
    }

    // Se muestra el userId (Mandato de Canvas para apps multi-usuario/identificación de dispositivo)
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Historial de Diagnósticos</Text>
            {userId && <Text style={styles.userIdText}>ID de Dispositivo: {userId}</Text>}
            
            {diagnostics.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="leaf-outline" size={80} color={COLORS.lightGray} />
                    <Text style={styles.emptyText}>
                        Aún no tienes diagnósticos. Usa la cámara para analizar tus primeras hojas de café.
                    </Text>
                    <TouchableOpacity 
                        style={{ ...styles.button, backgroundColor: COLORS.primary, padding: 10, marginTop: 20 }}
                        onPress={() => navigation.navigate('Camera')}
                    >
                        <Ionicons name="camera" size={20} color="white" />
                        <Text style={styles.buttonText}>Comenzar Análisis</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={diagnostics}
                    keyExtractor={(item) => item.id.toString()} // Key debe ser string para FlatList
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}
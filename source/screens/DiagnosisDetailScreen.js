// source/screens/DiagnosisDetailScreen.js

import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Eliminada la importación de expo-linking para resolver el error de dependencia
// import * as Linking from 'expo-linking'; 
import { deleteDiagnosis } from '../db/database';

// --- Constantes y Estilos ---
const COLORS = {
    primary: '#4CAF50', // Verde café
    secondary: '#795548', // Café
    background: '#F5F5F5',
    text: '#333333',
    success: '#8BC34A',
    danger: '#F44336',
    warning: '#FFC107',
    info: '#2196F3',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: 20,
        textAlign: 'center',
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    fullImage: {
        width: '100%',
        height: 350,
        borderRadius: 10,
        resizeMode: 'contain',
        backgroundColor: COLORS.background,
    },
    detailCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
        paddingBottom: 5,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        width: 120,
    },
    value: {
        fontSize: 14,
        color: COLORS.text,
        flexShrink: 1,
    },
    adviceText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
        marginTop: 10,
    },
    buttonDanger: {
        backgroundColor: COLORS.danger,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});

// Función de ayuda para obtener la recomendación (copiada de AnalysisScreen)
const getAdvice = (result) => {
    if (result.includes('Sana')) {
        return "¡Excelente! Continúa la vigilancia regular. Asegúrate de que las condiciones de suelo y nutrientes sean óptimas para mantener la salud del cultivo.";
    } else if (result.includes('Temprana')) {
        return "Se detectan signos tempranos de roya. Esto es el momento crítico para actuar. Se recomienda la remoción inmediata de hojas afectadas y la aplicación de fungicidas preventivos aprobados. Consulta a un agrónomo local para un plan de choque.";
    } else if (result.includes('Avanzada')) {
        return "El nivel de infección es alto y requiere intervención urgente. Implementa un plan de manejo integrado que incluya poda severa, control químico riguroso y mejora de la ventilación en el cultivo. La producción de esta planta podría estar comprometida.";
    }
    return "Recomendación no disponible. Por favor, consulta un especialista.";
};


/**
 * Pantalla de detalle para un registro de diagnóstico específico.
 */
export default function DiagnosisDetailScreen({ route, navigation }) {
    const { record } = route.params;

    if (!record) {
        return (
            <View style={styles.container}>
                <Text style={styles.header}>Error</Text>
                <Text style={styles.detailCard}>No se pudo cargar el registro de diagnóstico.</Text>
            </View>
        );
    }

    const handleDelete = () => {
        // Alerta personalizada para confirmar la eliminación
        Alert.alert(
            "Confirmar Eliminación",
            "¿Estás seguro de que quieres eliminar este registro de diagnóstico? Esta acción no se puede deshacer.",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                { 
                    text: "Eliminar", 
                    onPress: async () => {
                        try {
                            await deleteDiagnosis(record.id);
                            // En React Native, usamos Alert en lugar de un modal personalizado
                            // ya que es parte del entorno nativo.
                            Alert.alert("Éxito", "El diagnóstico ha sido eliminado.");
                            navigation.goBack(); // Volver a la lista después de eliminar
                        } catch (e) {
                            console.error("Error al eliminar:", e);
                            Alert.alert("Error", "Fallo al eliminar el registro.");
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    // Determinar el color del resultado
    let resultColor = COLORS.info;
    if (record.result && record.result.includes('Roya Avanzada')) {
        resultColor = COLORS.danger;
    } else if (record.result && record.result.includes('Roya Temprana')) {
        resultColor = COLORS.warning;
    } else if (record.result && record.result.includes('Sana')) {
        resultColor = COLORS.success;
    }


    const formattedDate = record.timestamp 
        ? new Date(record.timestamp).toLocaleDateString('es-CO', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        })
        : 'Fecha Desconocida';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.header}>Detalle del Diagnóstico #{record.id}</Text>

            <View style={styles.imageContainer}>
                <Image 
                    source={{ uri: record.imageUri }} 
                    style={styles.fullImage} 
                />
            </View>

            <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Resultado de la Clasificación</Text>
                
                <View style={styles.row}>
                    <Text style={styles.label}>Diagnóstico IA:</Text>
                    <Text style={[styles.value, { fontWeight: 'bold', color: resultColor }]}>
                        {record.result || 'N/A'}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Nivel de Confianza:</Text>
                    <Text style={styles.value}>
                        {(record.confidence * 100).toFixed(1)}%
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Fecha y Hora:</Text>
                    <Text style={styles.value}>
                        {formattedDate}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Planta:</Text>
                    <Text style={styles.value}>
                        {record.plant_name || 'Café (Default)'}
                    </Text>
                </View>

                <Text style={[styles.detailTitle, { marginTop: 15 }]}>Recomendación</Text>
                <Text style={styles.adviceText}>
                    {getAdvice(record.result)}
                </Text>

                {record.notes && (
                    <>
                        <Text style={[styles.detailTitle, { marginTop: 15 }]}>Notas Adicionales</Text>
                        <Text style={styles.adviceText}>{record.notes}</Text>
                    </>
                )}
            </View>
            
            <TouchableOpacity style={styles.buttonDanger} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Eliminar Diagnóstico</Text>
            </TouchableOpacity>

            <View style={{ height: 50 }} />
        </ScrollView>
    );
}
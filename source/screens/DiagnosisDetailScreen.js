// source/screens/DiagnosisDetailScreen.js

import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    imagePlaceholderBox: {
        width: '100%',
        height: 350,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0'
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
    const text = (result || '').toString();
    if (text.includes('Sana')) {
        return "¡Excelente! Continúa la vigilancia regular. Asegúrate de que las condiciones de suelo y nutrientes sean óptimas para mantener la salud del cultivo.";
    } else if (text.includes('Temprana')) {
        return "Se detectan signos tempranos de roya. Esto es el momento crítico para actuar. Se recomienda la remoción inmediata de hojas afectadas y la aplicación de fungicidas preventivos aprobados. Consulta a un agrónomo local para un plan de choque.";
    } else if (text.includes('Avanzada')) {
        return "El nivel de infección es alto y requiere intervención urgente. Implementa un plan de manejo integrado que incluya poda severa, control químico riguroso y mejora de la ventilación en el cultivo. La producción de esta planta podría estar comprometida.";
    }
    return "Recomendación no disponible. Por favor, consulta un especialista.";
};


/**
 * Pantalla de detalle para un registro de diagnóstico específico.
 */
export default function DiagnosisDetailScreen({ route, navigation }) {
    const { record } = route.params || {};

    if (!record) {
        return (
            <View style={styles.container}>
                <Text style={styles.header}>Error</Text>
                <Text style={styles.detailCard}>No se pudo cargar el registro de diagnóstico.</Text>
            </View>
        );
    }

    // Compatibilidad con distintas claves (image_uri o imageUri)
    const imageUri = record.image_uri || record.imageUri || record.image || null;

    // Fecha: soporta created_at / timestamp / date / createdAt
    const rawDate = record.created_at || record.timestamp || record.date || record.createdAt || null;
    const formattedDate = rawDate
        ? (() => {
            try {
                const d = new Date(rawDate);
                return d.toLocaleDateString('es-CO', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            } catch (e) {
                return 'Fecha inválida';
            }
        })()
        : 'Fecha Desconocida';

    // Confianza - protección si es null/undefined
    const confidenceText = (typeof record.confidence === 'number') 
        ? `${(record.confidence * 100).toFixed(1)}%` 
        : (record.confidence ? String(record.confidence) : 'N/A');

    const handleDelete = () => {
        Alert.alert(
            "Confirmar Eliminación",
            "¿Estás seguro de que quieres eliminar este registro de diagnóstico? Esta acción no se puede deshacer.",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Eliminar", 
                    onPress: async () => {
                        try {
                            await deleteDiagnosis(record.id);
                            Alert.alert("Éxito", "El diagnóstico ha sido eliminado.");
                            // Volver a la lista; subscribe en DiagnosisScreen actualizará la lista
                            navigation.goBack();
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

    // Determinar el color del resultado (usa record.result o record.issue)
    const resultText = record.result || record.issue || '';
    let resultColor = COLORS.info;
    if (resultText.includes('Roya Avanzada')) resultColor = COLORS.danger;
    else if (resultText.includes('Roya Temprana')) resultColor = COLORS.warning;
    else if (resultText.includes('Sana')) resultColor = COLORS.success;

    // -------------------------
    // Mostrar recomendación: preferir record.treatment (array) luego record.notes, luego getAdvice
    // -------------------------
    const initialRecommendation = (() => {
        if (Array.isArray(record.treatment) && record.treatment.length > 0) {
            // Formatear como viñetas
            return record.treatment.map(r => `• ${r}`).join('\n');
        }
        if (record.notes) {
            const notes = String(record.notes || '').trim();
            if (notes.startsWith('Recomendaciones:')) {
                const lines = notes.split('\n').map(l => l.trim()).filter(l => l && l !== 'Recomendaciones:');
                const recLines = lines.filter(l => l.startsWith('- ')).map(l => l.substring(2).trim());
                return recLines.length ? recLines.map(r => `• ${r}`).join('\n') : lines.join('\n');
            }
            return notes;
        }
        return null;
    })();

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.header}>Detalle del Diagnóstico #{record.id}</Text>

            <View style={styles.imageContainer}>
                {imageUri ? (
                    <Image 
                        source={{ uri: imageUri }} 
                        style={styles.fullImage} 
                        onError={(e) => console.warn('Error al cargar imagen detalle:', e.nativeEvent?.error)}
                    />
                ) : (
                    <View style={styles.imagePlaceholderBox}>
                        <Ionicons name="image-outline" size={48} color="#bbb" />
                        <Text style={{ color: '#777', marginTop: 8 }}>No hay imagen disponible</Text>
                    </View>
                )}
            </View>

            <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Resultado de la Clasificación</Text>
                
                <View style={styles.row}>
                    <Text style={styles.label}>Diagnóstico IA:</Text>
                    <Text style={[styles.value, { fontWeight: 'bold', color: resultColor }]}>
                        {resultText || 'N/A'}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Nivel de Confianza:</Text>
                    <Text style={styles.value}>
                        {confidenceText}
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
                    {initialRecommendation ? initialRecommendation : getAdvice(resultText)}
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
// source/components/DiagnosisCard.js 

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
    primary: '#4CAF50', 
    secondary: '#795548', 
    text: '#333333',
    success: '#8BC34A',
    danger: '#F44336',
    warning: '#FFC107',
    lightGray: '#F0F0F0',
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 10,
        backgroundColor: COLORS.lightGray,
        resizeMode: 'cover',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    issueText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 12,
        color: 'gray',
    },
    confidenceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    confidenceText: {
        fontSize: 12,
        color: COLORS.text,
        marginLeft: 5,
    },
    statusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
});

/**
 * Componente que muestra un resumen de un registro de diagnóstico.
 * @param {Object} record - El objeto de diagnóstico de SQLite.
 */
export default function DiagnosisCard({ record }) {
    // Determinar color basado en el resultado (columna 'result' mapeada desde 'issue')
    let statusColor = COLORS.primary;
    if (record.result && record.result.includes('Roya Avanzada')) {
        statusColor = COLORS.danger;
    } else if (record.result && record.result.includes('Roya Temprana')) {
        statusColor = COLORS.warning;
    } else if (record.result && record.result.includes('Sana')) {
         statusColor = COLORS.success;
    }


    const formattedDate = record.timestamp 
        ? new Date(record.timestamp).toLocaleDateString('es-CO', { 
            year: 'numeric', month: 'short', day: 'numeric' 
        })
        : 'Fecha Desconocida';
        
    const confidenceDisplay = record.confidence ? `${(record.confidence * 100).toFixed(0)}%` : 'N/A';

    return (
        <View style={styles.card}>
            <Image 
                source={{ uri: record.imageUri }} 
                style={styles.image} 
                onError={(e) => console.log("Error al cargar imagen en Card:", e.nativeEvent.error)}
            />
            <View style={styles.content}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                    <Text style={[styles.issueText, { color: statusColor }]}>
                        {record.result || 'Diagnóstico Pendiente'}
                    </Text>
                </View>
                <Text style={styles.dateText}>{formattedDate}</Text>
                <View style={styles.confidenceContainer}>
                    <Ionicons name="stats-chart" size={14} color={COLORS.secondary} />
                    <Text style={styles.confidenceText}>Confianza: {confidenceDisplay}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.lightGray} />
        </View>
    );
}
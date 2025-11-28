import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- Constantes y Estilos ---
const PRIMARY_COLOR = '#6AA84F'; // Verde
const ACCENT_COLOR = '#D32F2F'; // Rojo para problemas
const CARD_BG = '#FFFFFF';

/**
 * Función para formatear la fecha a un formato legible.
 */
const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Componente auxiliar para filas de detalle
 */
const DetailRow = ({ icon, label, value, highlight, color = PRIMARY_COLOR }) => (
  <View style={styles.detailRow}>
    <MaterialCommunityIcons name={icon} size={20} color={color} style={styles.rowIcon} />
    <Text style={styles.rowLabel}>{label}:</Text>
    <Text style={[styles.rowValue, highlight && styles.highlightValue, { color: color }]}>{value}</Text>
  </View>
);

/**
 * DiagnosisDetailScreen component: Muestra el detalle completo de un diagnóstico guardado.
 */
export default function DiagnosisDetailScreen() {
  const route = useRoute();
  const { diagnosis } = route.params || {};

  if (!diagnosis) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Error: No se encontró el diagnóstico.</Text>
      </View>
    );
  }

  const statusColor = diagnosis.status === 'Grave' ? ACCENT_COLOR : diagnosis.status === 'Moderado' ? '#FF9800' : PRIMARY_COLOR;
  const treatmentList = (diagnosis.treatment && Array.isArray(diagnosis.treatment)) ? diagnosis.treatment : [];
  const sourceList = (diagnosis.sources && Array.isArray(diagnosis.sources)) ? diagnosis.sources : [];

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      
      <Text style={styles.mainTitle}>Análisis Detallado</Text>
      
      {/* Sección de Imagen */}
      {diagnosis.photoUri && (
        <Image source={{ uri: diagnosis.photoUri }} style={styles.photoPreview} />
      )}
      
      {/* Tarjeta de Información General */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Información Clave</Text>
        
        <DetailRow 
            icon="calendar-clock" 
            label="Fecha de Guardado" 
            value={formatTimestamp(diagnosis.timestamp)} 
            color="#666"
        />
        <DetailRow 
            icon="spa" 
            label="Cultivo Identificado" 
            value={diagnosis.plant_name || 'Desconocido'} 
        />
        <DetailRow 
            icon="bug" 
            label="Problema/Enfermedad" 
            value={diagnosis.issue || 'No especificado'} 
            highlight={true}
            color={ACCENT_COLOR}
        />
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Nivel de Severidad:</Text>
          <Text style={[
            styles.statusValue,
            { color: statusColor }
          ]}>
            {diagnosis.status || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Tarjeta de Tratamiento */}
      {treatmentList.length > 0 && (
          <View style={styles.treatmentCard}>
              <Text style={styles.treatmentTitle}>Plan de Acción y Tratamiento</Text>
              {treatmentList.map((item, index) => (
                <View key={index} style={styles.treatmentItem}>
                  <Text style={styles.treatmentBullet}>•</Text>
                  <Text style={styles.treatmentText}>{item}</Text>
                </View>
              ))}
          </View>
      )}

      {/* Tarjeta de Fuentes (Citas) */}
      {sourceList.length > 0 && (
        <View style={styles.sourcesCard}>
          <Text style={styles.sourcesTitle}>Fuentes de Búsqueda (Google)</Text>
          {sourceList.map((source, index) => (
            <TouchableOpacity 
                key={index} 
                style={styles.sourceLink} 
                onPress={() => Linking.openURL(source.uri)}
            >
              <MaterialCommunityIcons name="link-variant" size={14} color="#007BFF" />
              <Text style={styles.sourceText} numberOfLines={1}>
                 {source.title || new URL(source.uri).hostname}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <View style={{ height: 40 }} /> {/* Espacio inferior */}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    marginBottom: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: ACCENT_COLOR,
  },
  photoPreview: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    resizeMode: 'cover',
    marginBottom: 25,
    borderWidth: 4,
    borderColor: PRIMARY_COLOR + '55',
  },
  // --- Estilos de Tarjetas ---
  infoCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  treatmentCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sourcesCard: {
    width: '100%',
    backgroundColor: '#E6FFE6', // Fondo verde claro
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: PRIMARY_COLOR,
  },
  
  // --- Contenido de Tarjeta ---
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_COLOR + '22',
    paddingBottom: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowIcon: {
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    flex: 1,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  highlightValue: {
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginTop: 10,
  },
  statusLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#444',
  },
  statusValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  
  // --- Estilos de Tratamiento ---
  treatmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#444',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  treatmentItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  treatmentBullet: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    marginRight: 8,
    lineHeight: 22,
  },
  treatmentText: {
    flex: 1,
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  
  // --- Estilos de Fuentes ---
  sourcesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  sourceText: {
    fontSize: 13,
    color: '#007BFF', // Color de enlace azul
    marginLeft: 5,
    textDecorationLine: 'underline',
    flex: 1,
  },
});
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // Hook para refrescar al enfocar
import { useNavigation } from '@react-navigation/native'; // <-- Importar useNavigation

// Importar funciones de DB
import { getDiagnoses, deleteDiagnosis } from '../db/database'; 

// --- Constantes ---
const PRIMARY_COLOR = '#6AA84F'; // Verde
const ACCENT_COLOR = '#D32F2F'; // Rojo para problemas
const CARD_BG = '#FFFFFF';

/**
 * Función para formatear la fecha a un formato legible.
 * @param {string} isoString - Fecha en formato ISO string.
 * @returns {string} Fecha y hora formateada.
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
 * DiagnosisScreen component: Muestra la lista de diagnósticos guardados.
 */
export default function DiagnosisScreen() {
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation(); // <-- Inicializar navegación

  /**
   * Carga los diagnósticos de la base de datos de forma asíncrona.
   */
  const fetchDiagnoses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDiagnoses();
      setDiagnoses(data);
    } catch (e) {
      console.error("Error al cargar diagnósticos:", e);
      setError('No se pudieron cargar los diagnósticos.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarga los datos cada vez que la pantalla se enfoca (al cambiar de pestaña)
  useFocusEffect(
    useCallback(() => {
      fetchDiagnoses();
    }, [fetchDiagnoses])
  );

  /**
   * Maneja la eliminación de un diagnóstico por ID.
   */
  const handleDelete = async (id) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar este diagnóstico?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Eliminar", 
          onPress: async () => {
            try {
              // Actualización optimista en UI
              setDiagnoses(prev => prev.filter(d => d.id !== id));
              const rowsAffected = await deleteDiagnosis(id);
              if (!rowsAffected) {
                // Si no se eliminó en DB, recargar para sincronizar
                await fetchDiagnoses();
                Alert.alert("Error", "No se pudo eliminar el diagnóstico en la base de datos.");
              }
            } catch (e) {
              console.error("Fallo al eliminar:", e);
              Alert.alert("Error", "No se pudo eliminar el diagnóstico.");
              // Reintentar cargar para sincronizar UI
              fetchDiagnoses();
            }
          },
          style: 'destructive'
        }
      ],
      { cancelable: true }
    );
  };
  
  /**
   * Navega a la pantalla de detalles del diagnóstico.
   */
  const handleViewDetail = (item) => {
    navigation.navigate('DiagnosisDetail', { diagnosis: item }); 
  };

  /**
   * Renderiza cada elemento de diagnóstico en la lista.
   * Memoizado para mejorar rendimiento.
   */
  const renderDiagnosisItem = useCallback(({ item }) => {
    const statusColor = item.status === 'Grave' ? ACCENT_COLOR : item.status === 'Moderado' ? '#FF9800' : PRIMARY_COLOR;
    
    return (
      <TouchableOpacity onPress={() => handleViewDetail(item)} style={styles.card}>
        <View style={styles.header}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={PRIMARY_COLOR} />
            <Text style={styles.titleText}>{item.issue || 'Diagnóstico Desconocido'}</Text>
        </View>

        <View style={styles.detailRow}>
            <Text style={styles.label}>Cultivo:</Text>
            <Text style={styles.value}>{item.plant_name || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
            <Text style={styles.label}>Fecha:</Text>
            <Text style={styles.value}>{formatTimestamp(item.timestamp)}</Text>
        </View>

        <View style={styles.detailRow}>
            <Text style={styles.label}>Severidad:</Text>
            <Text style={[styles.value, { fontWeight: 'bold', color: statusColor }]}>{item.status || 'N/A'}</Text>
        </View>

        <Text style={styles.treatmentTitle}>Tratamiento:</Text>
        {(item.treatment && Array.isArray(item.treatment) ? item.treatment : ['No hay recomendaciones disponibles.']).slice(0, 2).map((step, index) => (
            <Text key={index} style={styles.treatmentText}>• {step}</Text>
        ))}
        {item.treatment && item.treatment.length > 2 && <Text style={styles.moreText}>(Toca para ver el análisis completo)</Text>}

        <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={(e) => {
                e.stopPropagation && e.stopPropagation(); // Previene que el toque del botón active handleViewDetail
                handleDelete(item.id);
            }}
        >
            <MaterialCommunityIcons name="delete-outline" size={20} color={ACCENT_COLOR} />
            <Text style={styles.deleteButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handleViewDetail, handleDelete]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.statusMessage}>Cargando historial...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <MaterialCommunityIcons name="alert-circle" size={30} color={ACCENT_COLOR} />
        <Text style={styles.statusMessage}>{error}</Text>
      </View>
    );
  }

  if (diagnoses.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <MaterialCommunityIcons name="file-hidden" size={50} color="#ccc" />
        <Text style={styles.statusMessage}>No has guardado ningún diagnóstico aún.</Text>
        <Text style={styles.statusSubMessage}>Toma una foto y guárdala desde la pantalla de Análisis.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>Historial de Diagnósticos</Text>
      <FlatList
        data={diagnoses}
        renderItem={renderDiagnosisItem}
        keyExtractor={item => String(item.id ?? item.timestamp)}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        removeClippedSubviews={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    textAlign: 'center',
    marginBottom: 15,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  statusMessage: {
    marginTop: 15,
    fontSize: 18,
    color: '#555',
    fontWeight: '600',
  },
  statusSubMessage: {
    marginTop: 5,
    fontSize: 14,
    color: '#888',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 5,
    borderLeftColor: PRIMARY_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  treatmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginTop: 10,
    marginBottom: 5,
  },
  treatmentText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 10,
  },
  moreText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 5,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    padding: 8,
    borderRadius: 20,
    marginTop: 15,
    alignSelf: 'flex-end',
    minWidth: 100,
  },
  deleteButtonText: {
    marginLeft: 5,
    color: ACCENT_COLOR,
    fontWeight: '600',
  }
});
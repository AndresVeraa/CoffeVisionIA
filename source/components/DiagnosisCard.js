// source/components/DiagnosisCard.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DiagnosisCard = ({ diagnosis }) => {
  // Define el color del indicador de estado basado en si está 'Tratado' o 'Pendiente'
  const isTreated = diagnosis.status === 'Tratado';
  const statusColor = isTreated ? '#6AA84F' : '#FFC300'; // Verde para tratado, amarillo para pendiente
  const iconName = isTreated ? 'check-circle' : 'alert-circle';

  return (
    <View style={styles.card}>
      {/* Icono de Historial */}
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons 
          name="history" 
          size={30} 
          color="#38761D" 
        />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.plantName}>{diagnosis.plant_name}</Text>
        <Text style={styles.issueText}>Problema: {diagnosis.issue}</Text>
        <Text style={styles.dateText}>Fecha: {diagnosis.date}</Text>
      </View>

      <View style={styles.statusContainer}>
        <MaterialCommunityIcons 
          name={iconName} 
          size={20} 
          color={statusColor} 
        />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {diagnosis.status}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  iconContainer: { marginRight: 15 },
  infoContainer: { flex: 1 },
  plantName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  issueText: { fontSize: 14, color: '#666' },
  dateText: { fontSize: 12, color: '#999', marginTop: 4 },
  statusContainer: { alignItems: 'center', marginLeft: 10 },
  statusText: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
});

export default DiagnosisCard;
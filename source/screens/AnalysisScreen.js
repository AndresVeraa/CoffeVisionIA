// source/screens/AnalysisScreen.js

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { saveDiagnosis } from '../db/database'; // <-- Importar función de guardado

// --- Constantes y Configuración de la API ---
const PRIMARY_COLOR = '#6AA84F'; // Verde
const ACCENT_COLOR = '#D32F2F'; // Rojo para problemas
const CARD_BG = '#FFFFFF';
const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const API_KEY = ""; // La clave se inyectará automáticamente en el entorno Canvas

/**
 * Función auxiliar para convertir el URI local de un archivo a Base64.
 * @param {string} uri - URI del archivo local (e.g., file://...)
 * @returns {Promise<string|null>} Base64 sin prefijo data:
 */
const uriToBase64 = async (uri) => {
  if (!uri) return null;
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = typeof dataUrl === 'string' ? dataUrl.split(',')[1] : null;
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('uriToBase64 error:', err);
    return null;
  }
};

export default function AnalysisScreen() {
  const route = useRoute();
  // Aceptar ambos nombres de parámetro por compatibilidad
  const { photoUri, imageUri } = route.params || {};
  const uri = photoUri || imageUri || null;

  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  const SYSTEM_PROMPT = 
    "Eres un experto en fitopatología agrícola (diagnóstico de enfermedades de plantas). " +
    "Analiza la imagen de la hoja/cultivo. Basado en el análisis de la imagen y usando Google Search (si es necesario) para información actualizada, " +
    "identifica la planta, la enfermedad, el estado, y proporciona un tratamiento conciso. " +
    "Tu respuesta debe ser un objeto JSON que incluya: 'plant_name' (Nombre del cultivo), 'issue' (Enfermedad o Problema), " +
    "'status' (Severidad: Leve, Moderado, Grave), 'treatment' (Recomendaciones de tratamiento y prevención en 3-4 puntos).";

  useEffect(() => {
    if (uri) {
      processAnalysis(uri);
    } else {
      setError("No se recibió ninguna foto para analizar.");
      setLoading(false);
    }
  }, [uri]);

  const processAnalysis = async (uri) => {
    setLoading(true);
    setError(null);
    setSources([]);
    setDiagnosis(null);

    try {
      console.log("1. Convirtiendo URI a Base64...");
      const base64Image = await uriToBase64(uri);
      if (!base64Image) throw new Error("Fallo al convertir la imagen a Base64.");

      console.log("2. Realizando llamada asíncrona a la API de Gemini...");

      const headers = { 'Content-Type': 'application/json' };
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: "Analiza la siguiente imagen de la hoja del cultivo y genera un diagnóstico completo." },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              plant_name: { type: "STRING", description: "Nombre común del cultivo." },
              issue: { type: "STRING", description: "Nombre de la enfermedad o deficiencia." },
              status: { type: "STRING", enum: ["Leve", "Moderado", "Grave"] },
              treatment: { type: "ARRAY", items: { type: "STRING" }, description: "Lista de 3 a 4 recomendaciones." }
            }
          },
        },
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
      };

      const maxRetries = 3;
      let response;
      for (let i = 0; i < maxRetries; i++) {
        try {
          response = await fetch(`${API_URL_BASE}?key=${API_KEY}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          if (response.ok) break;
          if (i < maxRetries - 1) {
            const delay = Math.pow(2, i) * 1000;
            console.warn(`Intento ${i + 1} fallido. Reintentando en ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            throw new Error(`Fallo en la llamada a la API después de ${maxRetries} intentos.`);
          }
        } catch (fetchError) {
          if (i === maxRetries - 1) throw fetchError;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`API response failed: ${response?.statusText || 'Unknown Error'}`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        const jsonText = candidate.content.parts[0].text;
        const parsedDiagnosis = JSON.parse(jsonText);
        setDiagnosis(parsedDiagnosis);

        // Extraer fuentes
        let extractedSources = [];
        const groundingMetadata = candidate.groundingMetadata;
        if (groundingMetadata && groundingMetadata.groundingAttributions) {
          extractedSources = groundingMetadata.groundingAttributions
            .map(attribution => ({ uri: attribution.web?.uri, title: attribution.web?.title }))
            .filter(source => source.uri && source.title);
        }
        setSources(extractedSources);
      } else {
        throw new Error("La IA no pudo generar un diagnóstico estructurado.");
      }

    } catch (err) {
      console.error('Error durante el análisis de IA:', err);
      setError(`Error: ${err.message}. Asegúrate de que la API key y el modelo estén correctos.`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveDiagnosis = async () => {
    if (!diagnosis || !uri) {
      setSaveMessage({ type: 'error', text: 'No hay un diagnóstico o foto para guardar.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const diagnosisData = {
      ...diagnosis,
      photoUri: uri, // normalizado
      timestamp: new Date().toISOString(),
      sources
    };

    try {
      await saveDiagnosis(diagnosisData);
      setSaveMessage({ type: 'success', text: 'Diagnóstico guardado exitosamente!' });
    } catch (e) {
      console.error("Error al guardar el diagnóstico:", e);
      setSaveMessage({ type: 'error', text: 'Error al guardar. Inténtalo de nuevo.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Analizando la imagen con IA...</Text>
        <Text style={styles.loadingSubText}>(Esto puede tomar unos segundos)</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#FBE4E4' }]}>
        <MaterialCommunityIcons name="cloud-alert" size={40} color={ACCENT_COLOR} />
        <Text style={styles.errorText}>Error en el Análisis</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }
  
  const statusColor = diagnosis?.status === 'Grave' ? ACCENT_COLOR : diagnosis?.status === 'Moderado' ? '#FF9800' : PRIMARY_COLOR;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Resultado del Análisis</Text>

      {uri && <Image source={{ uri }} style={styles.photoPreview} />}

      {diagnosis && (
        <View style={styles.diagnosisCard}>
          <Text style={styles.cardTitle}>Diagnóstico Rápido</Text>
          
          <DiagnosisRow icon="spa" label="Cultivo" value={diagnosis.plant_name || 'Desconocido'} />
          <DiagnosisRow icon="bug" label="Problema Identificado" value={diagnosis.issue || 'No se detectó un problema claro'} highlight={true} />
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Severidad:</Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>{diagnosis.status || 'No especificada'}</Text>
          </View>

          <Text style={styles.treatmentTitle}>Recomendaciones de Tratamiento</Text>
          {diagnosis.treatment && Array.isArray(diagnosis.treatment) && diagnosis.treatment.map((item, index) => (
            <View key={index} style={styles.treatmentItem}>
              <Text style={styles.treatmentBullet}>•</Text>
              <Text style={styles.treatmentText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {sources.length > 0 && (
        <View style={styles.sourcesCard}>
          <Text style={styles.sourcesTitle}>Fuentes de Información Adicional</Text>
          {sources.map((source, index) => (
            <Text key={index} style={styles.sourceText} numberOfLines={1}>
              <MaterialCommunityIcons name="web" size={12} color="#444" /> {source.title} ({new URL(source.uri).hostname})
            </Text>
          ))}
        </View>
      )}

      {saveMessage && (
        <View style={[styles.messageBox, saveMessage.type === 'success' ? styles.successBox : styles.errorBox]}>
          <MaterialCommunityIcons name={saveMessage.type === 'success' ? "check-circle" : "close-circle"} size={20} color={saveMessage.type === 'success' ? '#fff' : ACCENT_COLOR} style={{ marginRight: 10 }} />
          <Text style={[styles.messageText, saveMessage.type === 'success' ? styles.successText : styles.errorMsgText]}>{saveMessage.text}</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSaveDiagnosis} disabled={!diagnosis || isSaving}>
        {isSaving ? <ActivityIndicator size="small" color="white" /> : <MaterialCommunityIcons name="content-save" size={24} color="white" />}
        <Text style={styles.saveButtonText}>{isSaving ? 'Guardando...' : 'Guardar Diagnóstico'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Componente auxiliar para filas de diagnóstico
const DiagnosisRow = ({ icon, label, value, highlight }) => (
  <View style={styles.diagnosisRow}>
    <MaterialCommunityIcons name={icon} size={20} color={PRIMARY_COLOR} style={styles.rowIcon} />
    <Text style={styles.rowLabel}>{label}:</Text>
    <Text style={[styles.rowValue, highlight && styles.highlightValue]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: PRIMARY_COLOR, marginBottom: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  loadingText: { marginTop: 15, fontSize: 18, fontWeight: '600', color: PRIMARY_COLOR },
  loadingSubText: { marginTop: 5, fontSize: 14, color: '#666' },
  errorText: { marginTop: 15, fontSize: 20, fontWeight: 'bold', color: ACCENT_COLOR },
  errorMessage: { marginVertical: 10, fontSize: 16, color: '#333', textAlign: 'center', paddingHorizontal: 20 },
  photoPreview: { width: '100%', height: 250, borderRadius: 15, resizeMode: 'cover', marginBottom: 25, borderWidth: 3, borderColor: PRIMARY_COLOR + '55' },
  diagnosisCard: { width: '100%', backgroundColor: CARD_BG, borderRadius: 15, padding: 20, marginBottom: 20, elevation: 5 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: PRIMARY_COLOR, marginBottom: 15, borderBottomWidth: 2, borderBottomColor: PRIMARY_COLOR + '22', paddingBottom: 5 },
  diagnosisRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowIcon: { marginRight: 10 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: '#444', flex: 1 },
  rowValue: { fontSize: 16, color: '#333', fontWeight: '400', flex: 2, textAlign: 'right' },
  highlightValue: { fontWeight: 'bold', color: ACCENT_COLOR },
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee', marginVertical: 10 },
  statusLabel: { fontSize: 17, fontWeight: '700', color: '#444' },
  statusValue: { fontSize: 17, fontWeight: '700' },
  treatmentTitle: { fontSize: 18, fontWeight: '700', color: '#444', marginTop: 15, marginBottom: 10 },
  treatmentItem: { flexDirection: 'row', marginBottom: 8 },
  treatmentBullet: { fontSize: 16, color: PRIMARY_COLOR, marginRight: 8, lineHeight: 22 },
  treatmentText: { flex: 1, fontSize: 15, color: '#555', lineHeight: 22 },
  sourcesCard: { width: '100%', backgroundColor: '#E6FFE6', borderRadius: 15, padding: 15, marginBottom: 20, borderLeftWidth: 5, borderLeftColor: PRIMARY_COLOR },
  sourcesTitle: { fontSize: 16, fontWeight: 'bold', color: PRIMARY_COLOR, marginBottom: 8 },
  sourceText: { fontSize: 13, color: '#444', marginBottom: 3 },
  saveButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY_COLOR, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 30, elevation: 5, marginBottom: 30 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  messageBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginVertical: 10, width: '100%' },
  successBox: { backgroundColor: PRIMARY_COLOR, shadowColor: PRIMARY_COLOR, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  errorBox: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: ACCENT_COLOR },
  messageText: { fontSize: 15, fontWeight: '600' },
  successText: { color: 'white' },
  errorMsgText: { color: ACCENT_COLOR }
});
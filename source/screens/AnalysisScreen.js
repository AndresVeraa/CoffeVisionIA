// source/screens/AnalysisScreen.js

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { insertDiagnosis } from '../db/database';

// --- Constantes y Configuración de la API ---
const PRIMARY_COLOR = '#6AA84F';
const ACCENT_COLOR = '#D32F2F';
const CARD_BG = '#FFFFFF';

// ⚠️ IMPORTANTE: Reemplaza con tu API key real
const API_KEY = "AIzaSyDQzGxFbeLhHIeYd9twfBlvn3i-doih330";

// ✅ MODELOS DISPONIBLES CORRECTOS (en orden de preferencia)
// Opción 1: Gemini 2.0 Flash (más reciente y rápido)
const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

// Alternativas si gemini-2.0-flash-exp no funciona:
// const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
// const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";

/**
 * Convierte URI local a Base64
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
    console.error('[uriToBase64] Error:', err);
    return null;
  }
};

export default function AnalysisScreen() {
  const route = useRoute();
  const { photoUri, imageUri } = route.params || {};
  const uri = photoUri || imageUri || null;

  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const SYSTEM_PROMPT =
    "Eres un experto en fitopatología agrícola especializado en café. " +
    "Analiza la imagen de la hoja/planta y proporciona un diagnóstico detallado. " +
    "IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin ```json). " +
    "Estructura requerida:\n" +
    '{\n' +
    '  "plant_name": "Nombre común del cultivo",\n' +
    '  "issue": "Enfermedad o problema identificado",\n' +
    '  "status": "Leve" | "Moderado" | "Grave",\n' +
    '  "treatment": ["Recomendación 1", "Recomendación 2", "Recomendación 3", "Recomendación 4"]\n' +
    '}';

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
      console.log("[handleAnalysis] Paso 1: Convirtiendo imagen a Base64...");
      const base64Image = await uriToBase64(uri);
      if (!base64Image) {
        throw new Error("No se pudo convertir la imagen a Base64.");
      }

      console.log("[handleAnalysis] Paso 2: Preparando payload para Gemini API...");
      const payload = {
        contents: [
          {
            parts: [
              {
                text: SYSTEM_PROMPT + "\n\nAnaliza esta imagen de la hoja del cultivo:"
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      };

      console.log("[handleAnalysis] Paso 3: Llamando a Gemini API...");
      const maxRetries = 3;
      let response;
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const url = `${API_URL_BASE}?key=${API_KEY}`;
          console.log(`[Gemini API] Intento ${attempt}/${maxRetries} -> ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);

          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            console.log("[Gemini API] ✓ Respuesta exitosa");
            break;
          }

          // Capturar error
          const errorText = await response.text();
          lastError = `Status ${response.status}: ${errorText}`;
          console.error(`[Gemini API] Status ${response.status}: ${errorText}`);

          // No reintentar en errores 4xx (problemas de configuración)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(
              `Error ${response.status}: Verifica:\n` +
              `1. API Key válida\n` +
              `2. Modelo disponible en tu región\n` +
              `3. Cuota no excedida\n\n` +
              `Detalles: ${errorText}`
            );
          }

          // Último intento
          if (attempt === maxRetries) {
            throw new Error(`API falló después de ${maxRetries} intentos: ${lastError}`);
          }

          // Backoff exponencial
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`[Gemini API] Reintentando en ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (fetchError) {
          console.error(`[Gemini API] Error intento ${attempt}:`, fetchError.message);
          if (attempt === maxRetries) throw fetchError;
          lastError = fetchError.message;
        }
      }

      if (!response || !response.ok) {
        throw new Error(lastError || 'Error desconocido en la API');
      }

      console.log("[handleAnalysis] Paso 4: Procesando respuesta JSON...");
      const result = await response.json();
      
      // Debug: ver estructura completa
      console.log("[Gemini Response] Estructura:", JSON.stringify(result, null, 2));

      const candidate = result.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error("La API no retornó contenido de texto válido.");
      }

      let jsonText = candidate.content.parts[0].text;
      console.log("[Gemini Response] Texto recibido:", jsonText);

      // Limpiar markdown si existe
      jsonText = jsonText
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();

      console.log("[Gemini Response] JSON limpio:", jsonText);

      const parsedDiagnosis = JSON.parse(jsonText);
      console.log("[Gemini Response] ✓ Diagnóstico parseado:", parsedDiagnosis);

      setDiagnosis(parsedDiagnosis);

      // Extraer fuentes (si existen)
      let extractedSources = [];
      const groundingMetadata = candidate.groundingMetadata;
      if (groundingMetadata?.groundingAttributions) {
        extractedSources = groundingMetadata.groundingAttributions
          .map(attr => ({
            uri: attr.web?.uri,
            title: attr.web?.title
          }))
          .filter(source => source.uri && source.title);
        console.log("[Gemini Response] Fuentes encontradas:", extractedSources.length);
      }
      setSources(extractedSources);

    } catch (err) {
      console.error('[handleAnalysis] ERROR FATAL:', err.message);
      setError(err.message || "Error desconocido durante el análisis.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!diagnosis || !uri) {
        setSaveMessage({ type: 'error', text: 'No hay diagnóstico para guardar.' });
        return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
        const createdAt = new Date().toISOString();

        // extraer recomendaciones / treatment
        const rawRecs = diagnosis.recommendations || diagnosis.recomendaciones || diagnosis.treatment || diagnosis.notes || null;
        // normalizar a array de strings
        let treatmentArray = [];
        if (Array.isArray(rawRecs)) treatmentArray = rawRecs;
        else if (typeof rawRecs === 'string') {
            // buscar líneas con "- " o separar por saltos de línea
            const lines = rawRecs.split('\n').map(l => l.trim()).filter(Boolean);
            const bullets = lines.filter(l => l.startsWith('- ')).map(l => l.substring(2).trim());
            treatmentArray = bullets.length ? bullets : lines;
        }

        // preparar notas legibles (guardamos el bloque original también)
        const notes = treatmentArray.length ? `Recomendaciones:\n${treatmentArray.map(r => `- ${r}`).join('\n')}` :
                      (rawRecs ? String(rawRecs) : '');

        const confidence = (typeof diagnosis.confidence === 'number') ? diagnosis.confidence : null;

        await insertDiagnosis(
            diagnosis.plant_name || 'Desconocido',
            diagnosis.issue || diagnosis.result || 'No identificado',
            createdAt,
            diagnosis.status || 'Pendiente',
            uri,
            { treatment: treatmentArray, notes, confidence }
        );

        setSaveMessage({ type: 'success', text: '✓ Diagnóstico guardado' });
    } catch (e) {
        console.error("Error al guardar:", e);
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
        <Text style={styles.loadingText}>Analizando con IA...</Text>
        <Text style={styles.loadingSubText}>(Esto puede tomar 5-10 segundos)</Text>
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

  const statusColor =
    diagnosis?.status === 'Grave' ? ACCENT_COLOR :
    diagnosis?.status === 'Moderado' ? '#FF9800' :
    PRIMARY_COLOR;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Resultado del Análisis</Text>

      {uri && <Image source={{ uri }} style={styles.photoPreview} />}

      {diagnosis && (
        <View style={styles.diagnosisCard}>
          <Text style={styles.cardTitle}>Diagnóstico Rápido</Text>

          <DiagnosisRow
            icon="spa"
            label="Cultivo"
            value={diagnosis.plant_name || 'Desconocido'}
          />
          <DiagnosisRow
            icon="bug"
            label="Problema"
            value={diagnosis.issue || 'No detectado'}
            highlight={true}
          />

          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Severidad:</Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>
              {diagnosis.status || 'No especificada'}
            </Text>
          </View>

          <Text style={styles.treatmentTitle}>Recomendaciones</Text>
          {diagnosis.treatment && Array.isArray(diagnosis.treatment) &&
            diagnosis.treatment.map((item, index) => (
              <View key={index} style={styles.treatmentItem}>
                <Text style={styles.treatmentBullet}>•</Text>
                <Text style={styles.treatmentText}>{item}</Text>
              </View>
            ))}
        </View>
      )}

      {sources.length > 0 && (
        <View style={styles.sourcesCard}>
          <Text style={styles.sourcesTitle}>Fuentes Adicionales</Text>
          {sources.map((source, index) => (
            <Text key={index} style={styles.sourceText} numberOfLines={1}>
              <MaterialCommunityIcons name="web" size={12} color="#444" />{' '}
              {source.title}
            </Text>
          ))}
        </View>
      )}

      {saveMessage && (
        <View
          style={[
            styles.messageBox,
            saveMessage.type === 'success' ? styles.successBox : styles.errorBox
          ]}
        >
          <MaterialCommunityIcons
            name={saveMessage.type === 'success' ? "check-circle" : "close-circle"}
            size={20}
            color={saveMessage.type === 'success' ? '#fff' : ACCENT_COLOR}
            style={{ marginRight: 10 }}
          />
          <Text
            style={[
              styles.messageText,
              saveMessage.type === 'success' ? styles.successText : styles.errorMsgText
            ]}
          >
            {saveMessage.text}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSaveDiagnosis}
        disabled={!diagnosis || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <MaterialCommunityIcons name="content-save" size={24} color="white" />
        )}
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Guardando...' : 'Guardar Diagnóstico'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Componente auxiliar
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  loadingText: { marginTop: 15, fontSize: 18, fontWeight: '600', color: PRIMARY_COLOR },
  loadingSubText: { marginTop: 5, fontSize: 14, color: '#666' },
  errorText: { marginTop: 15, fontSize: 20, fontWeight: 'bold', color: ACCENT_COLOR },
  errorMessage: {
    marginVertical: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    resizeMode: 'cover',
    marginBottom: 25,
    borderWidth: 3,
    borderColor: PRIMARY_COLOR + '55'
  },
  diagnosisCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 5
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_COLOR + '22',
    paddingBottom: 5
  },
  diagnosisRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowIcon: { marginRight: 10 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: '#444', flex: 1 },
  rowValue: { fontSize: 16, color: '#333', fontWeight: '400', flex: 2, textAlign: 'right' },
  highlightValue: { fontWeight: 'bold', color: ACCENT_COLOR },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginVertical: 10
  },
  statusLabel: { fontSize: 17, fontWeight: '700', color: '#444' },
  statusValue: { fontSize: 17, fontWeight: '700' },
  treatmentTitle: { fontSize: 18, fontWeight: '700', color: '#444', marginTop: 15, marginBottom: 10 },
  treatmentItem: { flexDirection: 'row', marginBottom: 8 },
  treatmentBullet: { fontSize: 16, color: PRIMARY_COLOR, marginRight: 8, lineHeight: 22 },
  treatmentText: { flex: 1, fontSize: 15, color: '#555', lineHeight: 22 },
  sourcesCard: {
    width: '100%',
    backgroundColor: '#E6FFE6',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: PRIMARY_COLOR
  },
  sourcesTitle: { fontSize: 16, fontWeight: 'bold', color: PRIMARY_COLOR, marginBottom: 8 },
  sourceText: { fontSize: 13, color: '#444', marginBottom: 3 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 5,
    marginBottom: 30
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%'
  },
  successBox: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3
  },
  errorBox: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: ACCENT_COLOR },
  messageText: { fontSize: 15, fontWeight: '600' },
  successText: { color: 'white' },
  errorMsgText: { color: ACCENT_COLOR }
});
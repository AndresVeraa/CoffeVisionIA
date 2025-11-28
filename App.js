// App.js

import React, { useState, useEffect } from 'react'; 
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native'; 
import { StatusBar } from 'expo-status-bar';

// Importar inicialización de DB (ahora asíncrona)
import { initDB } from './source/db/database'; 

// Importar Pantallas
import HomeScreen from './source/screens/HomeScreen';
import DiagnosisScreen from './source/screens/DiagnosisScreen'; 
import AnalysisScreen from './source/screens/AnalysisScreen'; 
import CameraScreen from './source/screens/CameraScreen'; 

const Tab = createBottomTabNavigator();
const InicioStack = createStackNavigator(); 

/**
 * Stack para la pestaña "Inicio": permite navegar de Home a Analysis y Camera.
 */
function InicioStackScreen() {
  return (
    <InicioStack.Navigator screenOptions={{ 
      headerShown: false // Oculta el encabezado del stack
    }}>
      <InicioStack.Screen name="InicioHome" component={HomeScreen} />
      <InicioStack.Screen 
        name="CameraScreen" 
        component={CameraScreen} 
        options={{ presentation: 'modal' }} 
      /> 
      <InicioStack.Screen name="Analysis" component={AnalysisScreen} />
    </InicioStack.Navigator>
  );
}

// Navegación principal (Tabs)
function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        tabBarActiveTintColor: '#6AA84F', 
        tabBarInactiveTintColor: '#666', 
        tabBarStyle: {
          backgroundColor: '#E6FFE6', 
          borderTopWidth: 1,
          borderTopColor: '#C8E6C9',
          height: 60,
          paddingBottom: 5,
        },
        headerShown: false, 
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={InicioStackScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="leaf" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Diagnosticos"
        component={DiagnosisScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Usamos la misma pantalla para la pestaña de Búsqueda por simplicidad */}
      <Tab.Screen
        name="Buscar" 
        component={DiagnosisScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
} 


export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Función asíncrona para manejar la inicialización de la DB
    const loadDatabase = async () => {
        try {
            await initDB(); // Llama al initDB asíncrono del archivo database.js
            setDbLoaded(true); 
        } catch (err) {
            console.error('Fallo crítico al inicializar la base de datos:', err);
            // Muestra error si la DB falla (ej. si no está en entorno nativo)
            setError('Error de DB: Verifica la instalación de expo-sqlite y el entorno nativo.');
            setDbLoaded(true); 
        }
    };
    
    loadDatabase();
  }, []);

  // Mostrar indicador de carga mientras la DB se inicializa
  if (!dbLoaded) {
    return (
      <View style={appStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#6AA84F" />
        <Text style={appStyles.loadingText}>Cargando base de datos...</Text>
      </View>
    );
  }
  
  // Mostrar mensaje de error si la inicialización falló
  if (error) {
    return (
      <View style={[appStyles.loadingContainer, { backgroundColor: '#FBE4E4' }]}>
        <MaterialCommunityIcons name="alert-circle" size={40} color="#D32F2F" />
        <Text style={appStyles.errorText}>¡ERROR CRÍTICO!</Text>
        <Text style={appStyles.errorMessage}>{error}</Text>
        <Text style={appStyles.helpText}>Asegúrate de ejecutar en Expo Go o un emulador.</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const appStyles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0E0E0' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
  errorText: { marginTop: 15, fontSize: 20, fontWeight: 'bold', color: '#D32F2F' },
  errorMessage: { marginVertical: 10, fontSize: 16, color: '#333', textAlign: 'center', paddingHorizontal: 20 },
  helpText: { fontSize: 14, color: '#777', fontStyle: 'italic' }
});
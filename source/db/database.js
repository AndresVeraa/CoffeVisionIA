// source/db/database.js

import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Inicializa la conexión a la base de datos y crea la tabla de diagnósticos.
 * @returns {Promise<void>}
 */
export const initializeFirebase = async () => {
    try {
        // En este entorno, usamos initDB para compatibilidad con la estructura de la app.
        await initDB();
        
        // Función dummy para userId, ya que SQLite no maneja autenticación.
        // Retorna un ID fijo para mantener la estructura de la aplicación.
        const fixedUserId = 'local-device-user'; 
        return fixedUserId; 
    } catch (err) {
        console.error('Error al inicializar la base de datos:', err);
        throw err;
    }
};

/**
 * Función base para inicializar la conexión a la base de datos SQLite.
 * @returns {Promise<void>}
 */
export const initDB = async () => {
    try {
        db = await SQLite.openDatabaseAsync('agros.db');
        
        // 1. Crear tabla si no existe (Schema base con todas las columnas actuales)
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS diagnoses (
                id INTEGER PRIMARY KEY NOT NULL,
                plant_name TEXT, 
                issue TEXT NOT NULL, 
                date TEXT NOT NULL, 
                status TEXT NOT NULL, 
                image_uri TEXT NOT NULL,
                confidence REAL,
                notes TEXT
            );
        `);

        // 2. Lógica de Migración (Soluciona el error "no such column: confidence")
        // Si la tabla existía de una versión anterior sin estas columnas, CREATE IF NOT EXISTS no las añade.
        // Intentamos añadirlas, ignorando el error si ya existen.
        
        try {
            await db.runAsync("ALTER TABLE diagnoses ADD COLUMN confidence REAL");
            console.log("Migración: Columna 'confidence' añadida.");
        } catch (e) {
            // Ignoramos el error si la columna ya existe.
            if (e.message.includes("duplicate column name")) {
                console.log("Migración: Columna 'confidence' ya existía.");
            } else {
                 console.warn("Advertencia al migrar columna 'confidence':", e);
            }
        }
        
        try {
            await db.runAsync("ALTER TABLE diagnoses ADD COLUMN notes TEXT");
            console.log("Migración: Columna 'notes' añadida.");
        } catch (e) {
            // Ignoramos el error si la columna ya existe.
            if (e.message.includes("duplicate column name")) {
                 console.log("Migración: Columna 'notes' ya existía.");
            } else {
                 console.warn("Advertencia al migrar columna 'notes':", e);
            }
        }
        
        console.log('Base de datos SQLite inicializada y esquema verificado.');
    } catch (err) {
        console.error('Error FATAL al inicializar/migrar la base de datos:', err);
        throw err;
    }
};


/**
 * Inserta un nuevo diagnóstico.
 * Adaptamos los parámetros para que se ajusten al flujo de la aplicación (imagenUri, result/issue, confidence).
 * @param {Object} diagnosisData - Datos del diagnóstico.
 * @param {string} diagnosisData.imageUri - URI local de la imagen.
 * @param {string} diagnosisData.result - Resultado del diagnóstico (Sana, Roya Temprana, etc.).
 * @param {number} diagnosisData.confidence - Nivel de confianza del modelo (0.0 a 1.0).
 * @param {string} [diagnosisData.notes=''] - Notas opcionales del usuario.
 * @returns {Promise<number>} ID del registro insertado
 */
export const saveDiagnosisRecord = async ({ imageUri, result, confidence, notes = '' }) => {
    if (!db) throw new Error('Base de datos no inicializada');
    
    // Mapeo a los campos de SQLite:
    const issue = result; // Mapeamos el 'result' del IA al 'issue' de la tabla.
    const date = new Date().toISOString();
    const plant_name = 'Café'; // Asumimos 'Café' por defecto.
    const status = result.includes('Sana') ? 'Sano' : 'Infectado'; 
    
    try {
        const sql = `INSERT INTO diagnoses (plant_name, issue, date, status, image_uri, confidence, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const values = [plant_name, issue, date, status, imageUri, confidence, notes];

        const result = await db.runAsync(sql, values);
        console.log("Diagnóstico SQLite guardado con ID: ", result.lastInsertRowId);
        return result.lastInsertRowId;
    } catch (err) {
        console.error('Error al insertar diagnóstico:', err);
        throw err;
    }
};

/**
 * Obtiene todos los diagnósticos (fetchDiagnoses).
 * Esta función reemplaza la lógica de 'onSnapshot' de Firestore.
 * @returns {Promise<Array<Object>>}
 */
export const fetchDiagnoses = async () => {
    if (!db) throw new Error('Base de datos no inicializada');
    
    try {
        // Obtenemos todos los registros, ordenados por ID (que es secuencial) de forma descendente.
        const allRows = await db.getAllAsync(
            'SELECT id, image_uri, issue as result, date as timestamp, status, confidence FROM diagnoses ORDER BY id DESC'
        );
        
        // Renombramos 'issue' a 'result' y 'date' a 'timestamp' para mantener la compatibilidad con el front-end de Firestore.
        return allRows; 
    } catch (err) {
        console.error('Error al obtener diagnósticos:', err);
        throw err;
    }
};

/**
 * Esta función es un wrapper para simular el comportamiento de suscripción (onSnapshot)
 * de Firestore, pero para SQLite solo realiza un fetch único.
 * @param {function} callback - Función a ejecutar con los datos actualizados.
 * @returns {function} Función de desuscripción (dummy).
 */
export const subscribeToDiagnosisRecords = (callback) => {
    // Definimos una función que obtendrá los datos de forma asíncrona.
    const refreshData = async () => {
        try {
            const records = await fetchDiagnoses();
            callback(records);
        } catch (e) {
            // El error real se mostraría aquí, pero lo reportamos en fetchDiagnoses
            console.error("Error al refrescar datos SQLite:", e);
        }
    };
    
    // Llamar una vez para obtener los datos iniciales.
    refreshData();

    // Como SQLite no tiene un listener en tiempo real, esta función es una función vacía.
    return () => {}; 
};

/**
 * Obtiene el ID del usuario actual (fijo para SQLite).
 * @returns {string | null} El ID de usuario.
 */
export const getUserId = () => 'local-device-user';

// Exportaciones adicionales si son necesarias para otras pantallas:
export const getDiagnosisById = async (id) => {
    if (!db) throw new Error('Base de datos no inicializada');
    
    try {
        const row = await db.getFirstAsync(
            'SELECT * FROM diagnoses WHERE id = ?',
            [id]
        );
        return row || null;
    } catch (err) {
        console.error('Error al obtener diagnóstico:', err);
        throw err;
    }
};

export const updateDiagnosis = async (id, updates) => {
    if (!db) throw new Error('Base de datos no inicializada');
    
    try {
        // Lógica simplificada de actualización:
        const setClause = Object.keys(updates)
            .map(key => `${key} = ?`)
            .join(', ');
        const values = [...Object.values(updates), id];
        
        await db.runAsync(
            `UPDATE diagnoses SET ${setClause} WHERE id = ?`,
            values
        );
        console.log(`Diagnóstico ${id} actualizado.`);
    } catch (err) {
        console.error('Error al actualizar diagnóstico:', err);
        throw err;
    }
};

export const deleteDiagnosis = async (id) => {
    if (!db) throw new Error('Base de datos no inicializada');
    
    try {
        await db.runAsync('DELETE FROM diagnoses WHERE id = ?', [id]);
        console.log(`Diagnóstico ${id} eliminado.`);
    } catch (err) {
        console.error('Error al eliminar diagnóstico:', err);
        throw err;
    }
};

export async function insertDiagnosis(plantName, issue, date, status, photoUri) {
    if (!db) throw new Error('Base de datos no inicializada');
    
    // Mapeo a los campos de SQLite:
    const imageUri = photoUri; // Usamos directamente el URI de la foto.
    const confidence = null; // Sin valor de confianza por defecto.
    const notes = ''; // Sin notas por defecto.
    
    try {
        const sql = `INSERT INTO diagnoses (plant_name, issue, date, status, image_uri, confidence, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const values = [plantName, issue, date, status, imageUri, confidence, notes];

        const result = await db.runAsync(sql, values);
        console.log("Diagnóstico SQLite guardado con ID: ", result.lastInsertRowId);
        return result.lastInsertRowId;
    } catch (err) {
        console.error('Error al insertar diagnóstico:', err);
        throw err;
    }
}
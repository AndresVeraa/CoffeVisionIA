// source/db/database.js
import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Inicializa la conexión a la base de datos.
 * @returns {Promise<void>}
 */
export const initDB = async () => {
  try {
    db = await SQLite.openDatabaseAsync('agros.db');
    
    // Crear tabla si no existe
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS diagnoses (
        id INTEGER PRIMARY KEY NOT NULL,
        plant_name TEXT NOT NULL,
        issue TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        image_uri TEXT NOT NULL
      );
    `);
    
    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
    throw err;
  }
};

/**
 * Inserta un nuevo diagnóstico.
 * @param {string} plantName
 * @param {string} issue
 * @param {string} date
 * @param {string} status
 * @param {string} imageUri
 * @returns {Promise<number>} ID del registro insertado
 */
export const insertDiagnosis = async (plantName, issue, date, status, imageUri) => {
  if (!db) throw new Error('Base de datos no inicializada');
  
  try {
    const result = await db.runAsync(
      `INSERT INTO diagnoses (plant_name, issue, date, status, image_uri) VALUES (?, ?, ?, ?, ?)`,
      [plantName, issue, date, status, imageUri]
    );
    return result.lastInsertRowId;
  } catch (err) {
    console.error('Error al insertar diagnóstico:', err);
    throw err;
  }
};

/**
 * Obtiene todos los diagnósticos.
 * @returns {Promise<Array<Object>>}
 */
export const fetchDiagnoses = async () => {
  if (!db) throw new Error('Base de datos no inicializada');
  
  try {
    const allRows = await db.getAllAsync(
      'SELECT * FROM diagnoses ORDER BY id DESC'
    );
    return allRows;
  } catch (err) {
    console.error('Error al obtener diagnósticos:', err);
    throw err;
  }
};

/**
 * Obtiene un diagnóstico por ID.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
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

/**
 * Actualiza un diagnóstico.
 * @param {number} id
 * @param {Object} updates - {plantName?, issue?, status?, etc}
 * @returns {Promise<void>}
 */
export const updateDiagnosis = async (id, updates) => {
  if (!db) throw new Error('Base de datos no inicializada');
  
  try {
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];
    
    await db.runAsync(
      `UPDATE diagnoses SET ${setClause} WHERE id = ?`,
      values
    );
  } catch (err) {
    console.error('Error al actualizar diagnóstico:', err);
    throw err;
  }
};

/**
 * Elimina un diagnóstico.
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deleteDiagnosis = async (id) => {
  if (!db) throw new Error('Base de datos no inicializada');
  
  try {
    await db.runAsync('DELETE FROM diagnoses WHERE id = ?', [id]);
  } catch (err) {
    console.error('Error al eliminar diagnóstico:', err);
    throw err;
  }
};
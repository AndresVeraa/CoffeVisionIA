// source/db/database.js

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_NAME = 'coffevision.db';
const DEVICE_ID_KEY = 'CV_DEVICE_ID';
const ASYNC_KEY_DIAG = 'CV_DIAGNOSES_STORE_v1';

let db = null;
const subscribers = new Set();
let inMemoryStore = null; // solo si AsyncStorage no está disponible

const openDB = () => {
  if (db) return db;
  if (!SQLite || typeof SQLite.openDatabase !== 'function') {
    console.warn('[DB] expo-sqlite native module NOT available.');
    return null;
  }
  try {
    db = SQLite.openDatabase(DB_NAME);
    return db;
  } catch (e) {
    console.warn('[DB] openDatabase error:', e);
    return null;
  }
};

const runSql = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const database = openDB();
    if (!database) return reject(new Error('expo-sqlite native module not available (openDB returned null).'));
    try {
      database.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }, (txError) => reject(txError));
    } catch (err) {
      reject(err);
    }
  });

// --- Fallback helpers usando AsyncStorage ---
const readAsyncStore = async () => {
  if (!AsyncStorage) {
    if (inMemoryStore === null) inMemoryStore = [];
    return inMemoryStore;
  }
  try {
    const raw = await AsyncStorage.getItem(ASYNC_KEY_DIAG);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[DB] readAsyncStore error:', e);
    return [];
  }
};

const writeAsyncStore = async (arr) => {
  if (!AsyncStorage) {
    inMemoryStore = arr;
    return;
  }
  try {
    await AsyncStorage.setItem(ASYNC_KEY_DIAG, JSON.stringify(arr));
  } catch (e) {
    console.warn('[DB] writeAsyncStore error:', e);
  }
};

// --- Init DB (try sqlite, otherwise no-op) ---
export const initDB = async () => {
  const database = openDB();
  if (!database) {
    console.warn('[DB] initDB: SQLite not available — using AsyncStorage fallback.');
    return;
  }
  try {
    await runSql(
      `CREATE TABLE IF NOT EXISTS diagnoses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_name TEXT,
        issue TEXT,
        status TEXT,
        treatment TEXT,
        image_uri TEXT,
        confidence REAL,
        created_at TEXT,
        notes TEXT
      );`
    );
    console.log('[DB] initDB: sqlite table ready');
  } catch (e) {
    console.error('[DB] initDB sqlite error:', e);
  }
};

const notifySubscribers = async () => {
  try {
    const rows = await fetchDiagnoses();
    subscribers.forEach(cb => {
      try { cb(rows); } catch (e) { console.error('[DB] subscriber cb error', e); }
    });
  } catch (e) {
    console.error('[DB] notifySubscribers error:', e);
  }
};

export const initializeFirebase = async () => {
  await initDB();
  try {
    if (AsyncStorage) {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `device-${Date.now()}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    }
  } catch (e) {
    console.warn('[DB] initializeFirebase warning:', e);
  }
  return `device-${Date.now()}`;
};

// --- Public API funcs (try sqlite; fallback to AsyncStorage) ---
export const insertDiagnosis = async (plantName, issue, dateIso, status, imageUri, opts = {}) => {
  await initDB();
  const treatmentStr = Array.isArray(opts.treatment) ? JSON.stringify(opts.treatment) : (opts.treatment ? JSON.stringify([opts.treatment]) : null);
  const confidence = (typeof opts.confidence === 'number') ? opts.confidence : (opts.confidence ?? null);
  const notes = opts.notes || '';

  const database = openDB();
  if (database) {
    const res = await runSql(
      `INSERT INTO diagnoses (plant_name, issue, status, treatment, image_uri, confidence, created_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [plantName, issue, status, treatmentStr, imageUri, confidence, dateIso, notes]
    );
    await notifySubscribers();
    return (res && (res.insertId ?? null)) || null;
  }

  // fallback using AsyncStorage / memory
  const list = await readAsyncStore();
  // generar id incremental
  const lastId = list.length ? Math.max(...list.map(r => r.id || 0)) : 0;
  const newRecord = {
    id: lastId + 1,
    plant_name: plantName,
    issue,
    status,
    treatment: treatmentStr ? (() => { try { return JSON.parse(treatmentStr); } catch { return null; } })() : null,
    treatment_raw: treatmentStr,
    image_uri: imageUri,
    confidence,
    created_at: dateIso,
    notes
  };
  list.unshift(newRecord); // orden desc
  await writeAsyncStore(list);
  await notifySubscribers();
  return newRecord.id;
};

export const deleteDiagnosis = async (id) => {
  await initDB();
  const database = openDB();
  if (database) {
    await runSql('DELETE FROM diagnoses WHERE id = ?', [id]);
    await notifySubscribers();
    return;
  }
  const list = await readAsyncStore();
  const filtered = list.filter(r => r.id !== id);
  await writeAsyncStore(filtered);
  await notifySubscribers();
};

export const fetchDiagnoses = async () => {
  await initDB();
  const database = openDB();
  if (database) {
    try {
      const res = await runSql('SELECT * FROM diagnoses ORDER BY id DESC', []);
      const rows = res.rows && res.rows._array ? res.rows._array : [];
      return rows.map(r => ({
        ...r,
        treatment: r.treatment ? (() => { try { return JSON.parse(r.treatment); } catch { return null; } })() : null,
        created_at: r.created_at || null,
        image_uri: r.image_uri || null
      }));
    } catch (e) {
      console.error('[DB] fetchDiagnoses sqlite error:', e);
      return [];
    }
  }
  // fallback AsyncStorage
  const list = await readAsyncStore();
  return list.map(r => ({
    ...r,
    treatment: r.treatment || (r.treatment_raw ? (() => { try { return JSON.parse(r.treatment_raw); } catch { return null; } })() : null),
    created_at: r.created_at || null,
    image_uri: r.image_uri || null
  }));
};

export const getDiagnosisById = async (id) => {
  await initDB();
  const database = openDB();
  if (database) {
    try {
      const res = await runSql('SELECT * FROM diagnoses WHERE id = ? LIMIT 1', [id]);
      const row = res.rows && res.rows._array && res.rows._array[0] ? res.rows._array[0] : null;
      if (!row) return null;
      return {
        ...row,
        treatment: row.treatment ? (() => { try { return JSON.parse(row.treatment); } catch { return null; } })() : null,
        created_at: row.created_at || null,
        image_uri: row.image_uri || null
      };
    } catch (e) {
      console.error('[DB] getDiagnosisById sqlite error:', e);
      return null;
    }
  }
  const list = await readAsyncStore();
  const found = list.find(r => r.id === id) || null;
  return found ? {
    ...found,
    treatment: found.treatment || (found.treatment_raw ? (() => { try { return JSON.parse(found.treatment_raw); } catch { return null; } })() : null)
  } : null;
};

export const subscribeToDiagnosisRecords = (cb) => {
  if (typeof cb !== 'function') return () => {};
  subscribers.add(cb);
  (async () => {
    try {
      const rows = await fetchDiagnoses();
      cb(rows);
    } catch (e) {
      console.error('[DB] subscribe initial fetch error:', e);
      cb([]);
    }
  })();
  return () => { subscribers.delete(cb); };
};
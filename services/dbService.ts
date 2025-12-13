import { openDB, IDBPDatabase } from 'idb';
import { AppState } from '../types';

const DB_NAME = 'gestion-academica-db';
const STORE_NAME = 'app-state-store';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

const openAppDB = (): Promise<IDBPDatabase> => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
};

export const saveState = async (state: AppState): Promise<void> => {
    try {
        const db = await openAppDB();
        // We remove toasts from the backup as they are transient state
        const stateToSave = { ...state, toasts: [] };
        await db.put(STORE_NAME, stateToSave, 'full-state');
    } catch (error) {
        console.error('Failed to save state to IndexedDB:', error);
    }
};

export const getState = async (): Promise<AppState | undefined> => {
    try {
        const db = await openAppDB();
        return await db.get(STORE_NAME, 'full-state');
    } catch (error) {
        console.error('Failed to get state from IndexedDB:', error);
        return undefined;
    }
};

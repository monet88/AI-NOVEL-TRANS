import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project, GlossaryTerm } from '../types';

interface WeaverDBSchema extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  glossary: {
    key: string;
    value: GlossaryTerm[];
  };
}

const DB_NAME = 'ai-novel-weaver-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WeaverDBSchema>> | null = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<WeaverDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('glossary')) {
          db.createObjectStore('glossary');
        }
      },
    });
  }
  return dbPromise;
};

export const persistenceService = {
  // Projects
  async loadProjects(): Promise<Project[]> {
    try {
      const db = await getDB();
      const allProjects = await db.getAll('projects');
      return allProjects || [];
    } catch (e) {
      console.error('Failed to load projects from IndexedDB:', e);
      return [];
    }
  },

  async saveProjects(projects: Project[]): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('projects', 'readwrite');
      
      // Clear existing first or we can use put for all, but what about deleted projects?
      // Since we just save an array, we should sync it: get all existing ones and delete ones that are not in the new array.
      const existingProjects = await tx.objectStore('projects').getAllKeys();
      const newProjectIds = new Set(projects.map((p) => p.id));
      
      for (const id of existingProjects) {
        if (!newProjectIds.has(id)) {
          await tx.objectStore('projects').delete(id);
        }
      }

      for (const project of projects) {
        await tx.objectStore('projects').put(project);
      }
      
      await tx.done;
    } catch (e) {
      console.error('Failed to save projects to IndexedDB:', e);
    }
  },

  // Glossary
  // For the glossary, we'll store them by projectId. We need to create it per project.
  async loadGlossary(projectId: string): Promise<GlossaryTerm[]> {
    try {
      const db = await getDB();
      const entries = await db.get('glossary', projectId);
      return entries || [];
    } catch (e) {
      console.error('Failed to load glossary from IndexedDB:', e);
      return [];
    }
  },

  async saveGlossary(projectId: string, entries: GlossaryTerm[]): Promise<void> {
    try {
      if (!projectId) return;
      const db = await getDB();
      await db.put('glossary', entries, projectId);
    } catch (e) {
      console.error('Failed to save glossary to IndexedDB:', e);
    }
  }
};

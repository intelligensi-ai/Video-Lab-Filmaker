import { FilmProject } from '../../types/film';
import { INITIAL_SAMPLE_PROJECT } from '../../data/sampleProject';

export interface StorageQuotaInfo {
  usedBytes: number;
  quotaBytes: number;
  percentage: number;
  isNearLimit: boolean;
}

export interface IProjectStorage {
  listProjects(): Promise<Array<{ id: string; title: string; updatedAt: number; sceneCount: number }>>;
  getProject(id: string): Promise<FilmProject | null>;
  saveProject(project: FilmProject): Promise<void>;
  deleteProject(id: string): Promise<void>;
  duplicateProject(id: string): Promise<FilmProject>;
  saveMedia(file: File | Blob, prefix?: string): Promise<{ url: string; size: number }>;
  getQuota(): Promise<StorageQuotaInfo>;
}

const DB_NAME = 'IntelligensiVideoLabFilmmakerDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_MEDIA = 'media_blobs';
const ACTIVE_PROJECT_KEY = 'intelligensi_active_project_id';

class IndexedDBProjectStorage implements IProjectStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async listProjects(): Promise<Array<{ id: string; title: string; updatedAt: number; sceneCount: number }>> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.getAll();

        request.onsuccess = () => {
          const list: FilmProject[] = request.result || [];
          if (list.length === 0) {
            // Seed initial sample project
            this.saveProject(INITIAL_SAMPLE_PROJECT).then(() => {
              resolve([
                {
                  id: INITIAL_SAMPLE_PROJECT.id,
                  title: INITIAL_SAMPLE_PROJECT.title,
                  updatedAt: INITIAL_SAMPLE_PROJECT.updatedAt,
                  sceneCount: INITIAL_SAMPLE_PROJECT.scenes.length,
                },
              ]);
            });
            return;
          }

          resolve(
            list.map((p) => ({
              id: p.id,
              title: p.title,
              updatedAt: p.updatedAt,
              sceneCount: p.scenes?.length || 0,
            }))
          );
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      // LocalStorage fallback
      const raw = localStorage.getItem('filmmaker_projects_meta');
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          // ignore
        }
      }
      return [
        {
          id: INITIAL_SAMPLE_PROJECT.id,
          title: INITIAL_SAMPLE_PROJECT.title,
          updatedAt: INITIAL_SAMPLE_PROJECT.updatedAt,
          sceneCount: INITIAL_SAMPLE_PROJECT.scenes.length,
        },
      ];
    }
  }

  async getProject(id: string): Promise<FilmProject | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else if (id === INITIAL_SAMPLE_PROJECT.id) {
            this.saveProject(INITIAL_SAMPLE_PROJECT);
            resolve(INITIAL_SAMPLE_PROJECT);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      const stored = localStorage.getItem(`filmmaker_project_${id}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // fallback
        }
      }
      return id === INITIAL_SAMPLE_PROJECT.id ? INITIAL_SAMPLE_PROJECT : null;
    }
  }

  async saveProject(project: FilmProject): Promise<void> {
    project.updatedAt = Date.now();
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.put(project);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
    }

    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
      // Safe partial backup in localStorage
      localStorage.setItem(`filmmaker_project_${project.id}`, JSON.stringify(project));
    } catch {
      // Quota exceeded in localStorage, IndexedDB is primary
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }
    localStorage.removeItem(`filmmaker_project_${id}`);
  }

  async duplicateProject(id: string): Promise<FilmProject> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error('Original project not found');

    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const copy: FilmProject = {
      ...JSON.parse(JSON.stringify(existing)),
      id: newId,
      title: `${existing.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveProject(copy);
    return copy;
  }

  async saveMedia(file: File | Blob, prefix = 'media'): Promise<{ url: string; size: number }> {
    const id = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA, 'readwrite');
        const store = tx.objectStore(STORE_MEDIA);
        const req = store.put(file, id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      const objectUrl = URL.createObjectURL(file);
      return { url: objectUrl, size: file.size };
    } catch {
      const objectUrl = URL.createObjectURL(file);
      return { url: objectUrl, size: file.size };
    }
  }

  async getQuota(): Promise<StorageQuotaInfo> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 1024 * 1024 * 1024; // fallback 1GB
        const percentage = Math.min(100, Math.round((used / quota) * 100));
        return {
          usedBytes: used,
          quotaBytes: quota,
          percentage,
          isNearLimit: percentage > 85,
        };
      } catch {
        // fallback
      }
    }
    return {
      usedBytes: 15 * 1024 * 1024,
      quotaBytes: 1024 * 1024 * 1024,
      percentage: 1.5,
      isNearLimit: false,
    };
  }

  getActiveProjectId(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  }

  setActiveProjectId(id: string): void {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  }
}

export const projectStorage: IndexedDBProjectStorage = new IndexedDBProjectStorage();

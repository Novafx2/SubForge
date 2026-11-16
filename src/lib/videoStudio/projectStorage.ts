import {
  MediaAsset,
  SavedProjectSummary,
  VideoProjectState,
  getTotalTimelineDurationMs,
} from '../../types/videoStudio';

const DB_NAME = 'subforge_video_studio_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'assets';

interface StoredAssetRecord {
  id: string;
  name: string;
  kind: 'video' | 'audio' | 'image';
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  width?: number;
  height?: number;
  waveformPeaks?: number[];
  blob: Blob;
  isBuiltin?: boolean;
}

interface StoredProjectRecord {
  id: string;
  name: string;
  updatedAt: string;
  project: VideoProjectState;
  assetIds: string[];
}

function openStudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open Video Studio IndexedDB.'));
  });
}

export async function saveProjectToIndexedDb(
  project: VideoProjectState,
  assets: Record<string, MediaAsset>
): Promise<void> {
  const db = await openStudioDb();

  // Identify referenced asset IDs from clips & audioItems plus any loaded media assets
  const referencedIds = new Set<string>();
  project.clips.forEach((c) => referencedIds.add(c.assetId));
  project.audioItems.forEach((a) => referencedIds.add(a.assetId));
  Object.keys(assets).forEach((id) => referencedIds.add(id));

  const assetRecords: StoredAssetRecord[] = [];
  for (const id of referencedIds) {
    const asset = assets[id];
    if (!asset) continue;
    assetRecords.push({
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      durationMs: asset.durationMs,
      width: asset.width,
      height: asset.height,
      waveformPeaks: asset.waveformPeaks,
      blob: asset.blob,
      isBuiltin: asset.isBuiltin,
    });
  }

  const record: StoredProjectRecord = {
    id: project.id,
    name: project.name,
    updatedAt: new Date().toISOString(),
    project: { ...project, updatedAt: new Date().toISOString() },
    assetIds: assetRecords.map((a) => a.id),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_ASSETS], 'readwrite');
    const projStore = tx.objectStore(STORE_PROJECTS);
    const assetStore = tx.objectStore(STORE_ASSETS);

    for (const a of assetRecords) {
      assetStore.put(a);
    }
    projStore.put(record);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to save project.'));
  });

  db.close();
}

export async function listSavedProjects(): Promise<SavedProjectSummary[]> {
  try {
    const db = await openStudioDb();
    const rows = await new Promise<StoredProjectRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const req = tx.objectStore(STORE_PROJECTS).getAll();
      req.onsuccess = () => resolve((req.result as StoredProjectRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        updatedAt: row.updatedAt,
        clipCount: row.project.clips.length,
        durationMs: getTotalTimelineDurationMs(row.project),
        aspectRatio: row.project.aspectRatio,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export async function loadProjectFromIndexedDb(
  projectId: string
): Promise<{ project: VideoProjectState; assets: Record<string, MediaAsset> } | null> {
  const db = await openStudioDb();
  const projRecord = await new Promise<StoredProjectRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).get(projectId);
    req.onsuccess = () => resolve(req.result as StoredProjectRecord | undefined);
    req.onerror = () => reject(req.error);
  });

  if (!projRecord) {
    db.close();
    return null;
  }

  const assetsMap: Record<string, MediaAsset> = {};
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, 'readonly');
    const store = tx.objectStore(STORE_ASSETS);
    for (const assetId of projRecord.assetIds) {
      const req = store.get(assetId);
      req.onsuccess = () => {
        const rec = req.result as StoredAssetRecord | undefined;
        if (rec && rec.blob) {
          assetsMap[rec.id] = {
            id: rec.id,
            name: rec.name,
            kind: rec.kind,
            mimeType: rec.mimeType,
            sizeBytes: rec.sizeBytes,
            durationMs: rec.durationMs,
            width: rec.width,
            height: rec.height,
            waveformPeaks: rec.waveformPeaks,
            blob: rec.blob,
            objectUrl: URL.createObjectURL(rec.blob),
            isBuiltin: rec.isBuiltin,
          };
        }
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
  return {
    project: projRecord.project,
    assets: assetsMap,
  };
}

export async function deleteSavedProject(projectId: string): Promise<void> {
  const db = await openStudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).delete(projectId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function exportProjectJson(project: VideoProjectState): string {
  return JSON.stringify(
    {
      schema: 'subforge-video-studio-v1',
      exportedAt: new Date().toISOString(),
      project,
    },
    null,
    2
  );
}

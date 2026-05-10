export interface LocalSessionState {
  accumulatedMinutes: number
  dailyGoalHours: number
  timerMinutes: number
  darkMode: boolean
  lastActiveDate: string
}

export interface ImageTransformState {
  scale: number
  offsetX: number
  offsetY: number
}

export interface ImageAssetState {
  fileName: string
  mimeType: string
  updatedAt: string
}

interface PersistedImageMetadata {
  asset: ImageAssetState
  transform: ImageTransformState
}

interface LoadedImageState {
  asset: ImageAssetState
  file: File
  transform: ImageTransformState
}

const SESSION_STORAGE_KEY = "bateria-diaria.local-session"
const DIRECTORY_DB_NAME = "bateria-diaria-directory"
const DIRECTORY_STORE_NAME = "handles"
const DIRECTORY_HANDLE_KEY = "workspace-directory"
const IMAGE_FILE_NAME = "bateria-diaria-image.bin"
const IMAGE_META_FILE_NAME = "bateria-diaria-image.json"

export const DEFAULT_IMAGE_TRANSFORM: ImageTransformState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

export const DEFAULT_SESSION_STATE: LocalSessionState = {
  accumulatedMinutes: 0,
  dailyGoalHours: 1,
  timerMinutes: 30,
  darkMode: false,
  lastActiveDate: getTodayStamp(),
}

export function getTodayStamp() {
  return new Date().toISOString().slice(0, 10)
}

function clampScale(value: number) {
  return Math.min(1.75, Math.max(0.85, Number.isFinite(value) ? value : 1))
}

export function normalizeImageTransform(transform?: Partial<ImageTransformState> | null): ImageTransformState {
  return {
    scale: clampScale(transform?.scale ?? DEFAULT_IMAGE_TRANSFORM.scale),
    offsetX: Number.isFinite(transform?.offsetX) ? Number(transform?.offsetX) : DEFAULT_IMAGE_TRANSFORM.offsetX,
    offsetY: Number.isFinite(transform?.offsetY) ? Number(transform?.offsetY) : DEFAULT_IMAGE_TRANSFORM.offsetY,
  }
}

export function normalizeSessionState(state?: Partial<LocalSessionState> | null): LocalSessionState {
  const nextState: LocalSessionState = {
    accumulatedMinutes: Number.isFinite(state?.accumulatedMinutes) ? Math.max(0, Number(state?.accumulatedMinutes)) : 0,
    dailyGoalHours: Number.isFinite(state?.dailyGoalHours) ? Math.max(1, Math.floor(Number(state?.dailyGoalHours))) : 1,
    timerMinutes: Number.isFinite(state?.timerMinutes) ? Math.max(1, Math.floor(Number(state?.timerMinutes))) : 30,
    darkMode: Boolean(state?.darkMode),
    lastActiveDate: typeof state?.lastActiveDate === "string" ? state.lastActiveDate : getTodayStamp(),
  }

  if (nextState.lastActiveDate !== getTodayStamp()) {
    nextState.accumulatedMinutes = 0
    nextState.lastActiveDate = getTodayStamp()
  }

  return nextState
}

export function loadSessionState() {
  if (typeof window === "undefined") {
    return DEFAULT_SESSION_STATE
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) {
    return DEFAULT_SESSION_STATE
  }

  try {
    return normalizeSessionState(JSON.parse(raw) as Partial<LocalSessionState>)
  } catch {
    return DEFAULT_SESSION_STATE
  }
}

export function saveSessionState(state: LocalSessionState) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizeSessionState(state)))
}

function openDirectoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DIRECTORY_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DIRECTORY_STORE_NAME)) {
        db.createObjectStore(DIRECTORY_STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"))
  })
}

async function withDirectoryStore<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDirectoryDb()

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(DIRECTORY_STORE_NAME, mode)
    const store = transaction.objectStore(DIRECTORY_STORE_NAME)
    const request = handler(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"))
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"))
  })
}

export async function persistDirectoryHandle(handle: FileSystemDirectoryHandle) {
  await withDirectoryStore("readwrite", (store) => store.put(handle, DIRECTORY_HANDLE_KEY))
}

export async function restoreDirectoryHandle() {
  try {
    return await withDirectoryStore<FileSystemDirectoryHandle | undefined>("readonly", (store) => store.get(DIRECTORY_HANDLE_KEY))
  } catch {
    return undefined
  }
}

export async function canReuseDirectoryHandle(handle: FileSystemDirectoryHandle) {
  const permission = await handle.queryPermission({ mode: "readwrite" })
  return permission === "granted"
}

export async function requestDirectoryAccess(handle: FileSystemDirectoryHandle) {
  const permission = await handle.requestPermission({ mode: "readwrite" })
  return permission === "granted"
}

async function writeJsonFile(handle: FileSystemDirectoryHandle, name: string, value: unknown) {
  const fileHandle = await handle.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(value, null, 2))
  await writable.close()
}

async function readJsonFile<T>(handle: FileSystemDirectoryHandle, name: string) {
  try {
    const fileHandle = await handle.getFileHandle(name)
    const file = await fileHandle.getFile()
    return JSON.parse(await file.text()) as T
  } catch {
    return null
  }
}

export async function saveImageToDirectory(
  handle: FileSystemDirectoryHandle,
  file: File,
  transform: ImageTransformState,
) {
  const imageHandle = await handle.getFileHandle(IMAGE_FILE_NAME, { create: true })
  const writable = await imageHandle.createWritable()
  await writable.write(file)
  await writable.close()

  const asset: ImageAssetState = {
    fileName: file.name || IMAGE_FILE_NAME,
    mimeType: file.type || "image/png",
    updatedAt: new Date().toISOString(),
  }

  await writeJsonFile(handle, IMAGE_META_FILE_NAME, {
    asset,
    transform: normalizeImageTransform(transform),
  } satisfies PersistedImageMetadata)

  return asset
}

export async function saveImageTransform(handle: FileSystemDirectoryHandle, asset: ImageAssetState, transform: ImageTransformState) {
  await writeJsonFile(handle, IMAGE_META_FILE_NAME, {
    asset,
    transform: normalizeImageTransform(transform),
  } satisfies PersistedImageMetadata)
}

export async function loadImageFromDirectory(handle: FileSystemDirectoryHandle): Promise<LoadedImageState | null> {
  try {
    const imageHandle = await handle.getFileHandle(IMAGE_FILE_NAME)
    const file = await imageHandle.getFile()
    const metadata = await readJsonFile<PersistedImageMetadata>(handle, IMAGE_META_FILE_NAME)
    const asset: ImageAssetState = metadata?.asset ?? {
      fileName: file.name || IMAGE_FILE_NAME,
      mimeType: file.type || "image/png",
      updatedAt: new Date(file.lastModified).toISOString(),
    }

    return {
      asset,
      file,
      transform: normalizeImageTransform(metadata?.transform),
    }
  } catch {
    return null
  }
}

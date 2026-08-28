import { KEYS } from "./constants.ts";

export const MAX_CUSTOM_THEME_BYTES = 5 * 1024 * 1024;
export const MIN_CUSTOM_THEME_WIDTH = 800;

export interface CustomThemeMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  createdAt: number;
}

export function validateCustomThemeMetadata(value: Pick<CustomThemeMetadata, "type" | "size" | "width">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(value.type)) return "Use a JPG, PNG, or WEBP image.";
  if (value.size > MAX_CUSTOM_THEME_BYTES) return "Custom themes must be 5 MB or smaller.";
  if (value.width < MIN_CUSTOM_THEME_WIDTH) return "Custom themes need a minimum width of 800px.";
  return null;
}

function openThemeDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB is unavailable."));
    const request = indexedDB.open("ytdoro-custom-themes", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open theme storage."));
  });
}

function readDimensions(file: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).then((bitmap) => {
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    });
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image dimensions.")); };
    image.src = url;
  });
}

function readMetadata(): CustomThemeMetadata[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEYS.customThemeMeta) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function listCustomThemeMetadata(): CustomThemeMetadata[] {
  return readMetadata();
}

export async function saveCustomTheme(file: File, name = "Custom scene"): Promise<CustomThemeMetadata> {
  const dimensions = await readDimensions(file);
  const error = validateCustomThemeMetadata({ type: file.type, size: file.size, width: dimensions.width });
  if (error) throw new Error(error);
  const metadata: CustomThemeMetadata = {
    id: `custom-${Date.now()}`,
    name: name.trim() || "Custom scene",
    type: file.type,
    size: file.size,
    width: dimensions.width,
    height: dimensions.height,
    createdAt: Date.now(),
  };
  const db = await openThemeDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("images", "readwrite");
    transaction.objectStore("images").put(file, metadata.id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save custom theme."));
  });
  localStorage.setItem(KEYS.customThemeMeta, JSON.stringify([...readMetadata(), metadata]));
  return metadata;
}

export async function getCustomThemeUrl(id: string): Promise<string | null> {
  try {
    const db = await openThemeDb();
    const file = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction("images").objectStore("images").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return file ? URL.createObjectURL(file) : null;
  } catch {
    return null;
  }
}

export async function removeCustomTheme(id: string): Promise<void> {
  try {
    const db = await openThemeDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("images", "readwrite");
      transaction.objectStore("images").delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    localStorage.setItem(KEYS.customThemeMeta, JSON.stringify(readMetadata().filter((item) => item.id !== id)));
  }
}

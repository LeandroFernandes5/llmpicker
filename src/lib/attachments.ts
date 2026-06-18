import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import type { Attachment } from '@/providers/types';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function inferMime(filename?: string | null, fallback = 'application/octet-stream'): string {
  if (!filename) return fallback;
  const ext = filename.split('.').pop()?.toLowerCase();
  return (ext && EXT_MIME[ext]) || fallback;
}

function imageMimeFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.mimeType) return asset.mimeType;
  if (asset.uri.endsWith('.png')) return 'image/png';
  if (asset.uri.endsWith('.webp')) return 'image/webp';
  if (asset.uri.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

export async function pickImageFromLibrary(): Promise<Attachment | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Photo library access was denied. Enable it in Settings to attach images.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    base64: true,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return {
    id: newId(),
    role: 'image',
    mimeType: imageMimeFromAsset(a),
    fileName: a.fileName ?? undefined,
    base64: a.base64 ?? '',
  };
}

export async function takePhoto(): Promise<Attachment | null> {
  const camPerm = await ImagePicker.requestCameraPermissionsAsync();
  if (!camPerm.granted) {
    throw new Error('Camera access was denied. Enable it in Settings to take photos.');
  }
  const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!libPerm.granted) {
    throw new Error('Photo library access was denied. Enable it in Settings to save photos.');
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.9,
    base64: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return {
    id: newId(),
    role: 'image',
    mimeType: imageMimeFromAsset(a),
    fileName: a.fileName ?? 'photo.jpg',
    base64: a.base64 ?? '',
  };
}

export async function pickDocument(): Promise<Attachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  const base64 = a.base64 ?? (await readAsStringAsync(a.uri, { encoding: EncodingType.Base64 }));
  const mime = a.mimeType || inferMime(a.name);
  return {
    id: newId(),
    role: mime.startsWith('image/') ? 'image' : 'document',
    mimeType: mime,
    fileName: a.name,
    base64,
  };
}

export function attachmentDataUri(a: Attachment): string {
  return `data:${a.mimeType};base64,${a.base64}`;
}

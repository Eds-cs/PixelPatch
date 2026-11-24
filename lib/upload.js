// lib/upload.js
// Multipart helpers. React Native's FormData takes a { uri, name, type }
// descriptor, while the browser needs a real Blob/File — so image fields have
// to be appended differently per platform.
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

const guessName = (uri, fallback) => {
  const fromUri = uri?.split("/").pop()?.split("?")[0];
  return fromUri && fromUri.includes(".") ? fromUri : fallback;
};

const guessType = (name) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
};

/** Appends one picker asset to a FormData under `field`. */
export async function appendImage(formData, field, asset, index = 0) {
  if (!asset?.uri) return;

  const name = asset.fileName || guessName(asset.uri, `upload-${index}.jpg`);
  const type = asset.mimeType || guessType(name);

  if (Platform.OS === "web") {
    // On web the picker hands back a blob:/data: URL — materialise it.
    const blob = await fetch(asset.uri).then((r) => r.blob());
    formData.append(field, new File([blob], name, { type: blob.type || type }));
    return;
  }

  formData.append(field, { uri: asset.uri, name, type });
}

/**
 * Requests permission and opens the library.
 * Returns an array of assets (empty if cancelled or denied).
 */
export async function pickImages({ multiple = false, limit = 10 } = {}) {
  // Web needs no permission prompt; the file input is the gate.
  if (Platform.OS !== "web") {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      throw new Error("Photo access is required to attach images.");
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? limit : 1,
    quality: 0.7,
  });

  if (result.canceled) return [];
  return result.assets ?? [];
}

/**
 * Opens the system file picker for one document (PDF or photo).
 * Returns the asset, or null if cancelled. Rejects files over `maxBytes`.
 */
export async function pickDocument({
  types = ["application/pdf", "image/jpeg", "image/png"],
  maxBytes = 10 * 1024 * 1024,
} = {}) {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0] ?? null;
  if (asset?.size && asset.size > maxBytes) {
    throw new Error(`That file is larger than ${Math.round(maxBytes / 1024 / 1024)} MB. Choose a smaller one.`);
  }
  return asset;
}

/** Appends one document-picker asset to a FormData under `field`. */
export async function appendFile(formData, field, asset) {
  if (!asset?.uri) return;
  const name = asset.name || guessName(asset.uri, "document");
  const type = asset.mimeType || "application/octet-stream";

  if (Platform.OS === "web") {
    // The web picker hands back the real File; fall back to the blob: URL.
    const file = asset.file ?? new File([await fetch(asset.uri).then((r) => r.blob())], name, { type });
    formData.append(field, file, name);
    return;
  }

  formData.append(field, { uri: asset.uri, name, type });
}

/** Multipart POST that lets axios set its own boundary. */
export function multipartConfig() {
  return { headers: { "Content-Type": "multipart/form-data" } };
}

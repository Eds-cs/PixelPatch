// lib/upload.js
// Multipart helpers. React Native's FormData takes a { uri, name, type }
// descriptor, while the browser needs a real Blob/File — so image fields have
// to be appended differently per platform.
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

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

/** Multipart POST that lets axios set its own boundary. */
export function multipartConfig() {
  return { headers: { "Content-Type": "multipart/form-data" } };
}

// lib/maps.js — Google Maps links for a shop's address.
//
// Uses Google's "Maps URLs" (https://developers.google.com/maps/documentation/urls),
// which need no API key. On phones they open the Google Maps app when it's
// installed; on the web they open Google Maps in a new tab.
import { Linking } from "react-native";

import { formatAddress } from "./format";

// Exact coordinates when the address has them, else the written address.
function placeQuery(address) {
  const lat = Number(address?.latitude);
  const lng = Number(address?.longitude);
  const hasCoordinates =
    address?.latitude !== null && address?.latitude !== undefined &&
    address?.longitude !== null && address?.longitude !== undefined &&
    Number.isFinite(lat) && Number.isFinite(lng);
  if (hasCoordinates) return `${lat},${lng}`;
  const written = formatAddress(address);
  const city = /zamboanga city/i.test(written) ? "" : "Zamboanga City";
  return [written, city, "Philippines"].filter(Boolean).join(", ");
}

export const mapsSearchUrl = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery(address))}`;

export const mapsDirectionsUrl = (address) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeQuery(address))}`;

// Embedded map (Maps Embed API). Needs a key: EXPO_PUBLIC_GOOGLE_MAPS_EMBED_KEY.
export const MAPS_EMBED_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_EMBED_KEY || "";

export const mapsEmbedUrl = (address) =>
  `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(MAPS_EMBED_KEY)}&q=${encodeURIComponent(placeQuery(address))}&zoom=16`;

export const openInMaps = (url) => Linking.openURL(url);

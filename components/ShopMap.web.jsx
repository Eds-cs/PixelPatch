// components/ShopMap.web.jsx — embedded Google map (web only).
// Shown only when EXPO_PUBLIC_GOOGLE_MAPS_EMBED_KEY is set; otherwise the
// shop page's "Get directions" / "Open in Google Maps" buttons are enough.
// Phones use components/ShopMap.jsx.
import { View } from "react-native";

import { MAPS_EMBED_KEY, mapsEmbedUrl } from "../lib/maps";

export default function ShopMap({ address, title }) {
  if (!MAPS_EMBED_KEY) return null;
  return (
    <View className="mt-4 overflow-hidden rounded-xl border border-gray-200" style={{ height: 240 }}>
      <iframe
        title={title ? `Map showing ${title}` : "Map"}
        src={mapsEmbedUrl(address)}
        style={{ border: 0, width: "100%", height: "100%" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </View>
  );
}

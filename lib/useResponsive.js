import { useWindowDimensions } from "react-native";

export const BREAKPOINTS = { tablet: 768, desktop: 1200 };

export function getDeviceLayout(width) {
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}

export function useResponsive() {
  const { width } = useWindowDimensions();
  const layout = getDeviceLayout(width);
  return {
    layout,
    isMobile: layout === "mobile",
    isTablet: layout === "tablet",
    isDesktop: layout === "desktop",
    horizontalPadding: layout === "mobile" ? 16 : 24,
  };
}

declare const __GA4_MEASUREMENT_ID__: string | undefined;

type AnalyticsEvent =
  | "page_view"
  | "click_start"
  | "result_generated"
  | "click_save_image"
  | "click_share"
  | "copy_link";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

type GtagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFunction;
  }
}

const measurementId = (import.meta.env.VITE_GA4_MEASUREMENT_ID || __GA4_MEASUREMENT_ID__ || "").trim();
const isDev = import.meta.env.DEV;
let didInit = false;
let didRequestScript = false;

function getUtmParams() {
  if (typeof window === "undefined") {
    return { utm_source: "", utm_medium: "", utm_campaign: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || ""
  };
}

export function getPagePath() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

export function getSharedAnalyticsPayload() {
  return {
    ...getUtmParams(),
    page_path: getPagePath()
  };
}

function initGA4() {
  if (!measurementId || didInit || typeof window === "undefined") return;

  didInit = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtagShim(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });

  if (!didRequestScript) {
    didRequestScript = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onerror = () => {
      if (isDev) console.warn("[analytics] GA4 script failed to load");
    };
    document.head.appendChild(script);
  }
}

export function trackEvent(eventName: AnalyticsEvent, payload: AnalyticsPayload = {}) {
  const eventPayload = {
    ...payload,
    timestamp: new Date().toISOString()
  };

  if (!measurementId) {
    if (isDev) console.log("[analytics]", eventName, eventPayload);
    return;
  }

  try {
    initGA4();
    window.setTimeout(() => {
      try {
        window.gtag?.("event", eventName, eventPayload);
      } catch (error) {
        if (isDev) console.warn("[analytics] event failed", eventName, error);
      }
    }, 0);
  } catch (error) {
    if (isDev) console.warn("[analytics] setup failed", error);
  }
}

export const analytics = {
  trackEvent
};

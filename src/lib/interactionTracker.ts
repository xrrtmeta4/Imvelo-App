/**
 * Cookie-based interaction tracker for analytics and knowledge graph enrichment.
 * Tracks page views, feature usage, scan counts, and session data.
 */

const COOKIE_NAME = 'imvelo_interactions';
const COOKIE_EXPIRY_DAYS = 365;

interface InteractionData {
  sessionCount: number;
  lastVisit: string;
  pageViews: Record<string, number>;
  featureUsage: Record<string, number>;
  scanCount: number;
  chatCount: number;
  preferredFeatures: string[];
  firstVisit: string;
  totalTimeMinutes: number;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

function getInteractionData(): InteractionData {
  try {
    const raw = getCookie(COOKIE_NAME);
    if (raw) return JSON.parse(raw);
  } catch {
    // Fallback if cookie is malformed
  }
  return {
    sessionCount: 0,
    lastVisit: new Date().toISOString(),
    pageViews: {},
    featureUsage: {},
    scanCount: 0,
    chatCount: 0,
    preferredFeatures: [],
    firstVisit: new Date().toISOString(),
    totalTimeMinutes: 0,
  };
}

function saveInteractionData(data: InteractionData) {
  // Cookie max ~4KB, so trim if needed
  const trimmed = { ...data };
  // Keep only top 20 page views
  const sortedPages = Object.entries(trimmed.pageViews)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);
  trimmed.pageViews = Object.fromEntries(sortedPages);

  // Keep only top 15 features
  const sortedFeatures = Object.entries(trimmed.featureUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);
  trimmed.featureUsage = Object.fromEntries(sortedFeatures);
  trimmed.preferredFeatures = sortedFeatures.slice(0, 5).map(([k]) => k);

  setCookie(COOKIE_NAME, JSON.stringify(trimmed), COOKIE_EXPIRY_DAYS);
}

// ===== Public API =====

export function trackPageView(path: string) {
  const data = getInteractionData();
  data.pageViews[path] = (data.pageViews[path] || 0) + 1;
  data.lastVisit = new Date().toISOString();
  saveInteractionData(data);
}

export function trackFeatureUsage(feature: string) {
  const data = getInteractionData();
  data.featureUsage[feature] = (data.featureUsage[feature] || 0) + 1;
  saveInteractionData(data);
}

export function trackScan() {
  const data = getInteractionData();
  data.scanCount += 1;
  saveInteractionData(data);
}

export function trackChat() {
  const data = getInteractionData();
  data.chatCount += 1;
  saveInteractionData(data);
}

export function startSession() {
  const data = getInteractionData();
  data.sessionCount += 1;
  data.lastVisit = new Date().toISOString();
  saveInteractionData(data);
}

export function trackTimeSpent(minutes: number) {
  const data = getInteractionData();
  data.totalTimeMinutes += minutes;
  saveInteractionData(data);
}

export function getAnalytics(): InteractionData {
  return getInteractionData();
}

export function getPreferredFeatures(): string[] {
  return getInteractionData().preferredFeatures;
}

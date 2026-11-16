import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface WebsiteBrandingState {
  customFaviconDataUrl: string | null;
  customFaviconMimeType: string | null;
  customFaviconName: string | null;
  siteName: string;
  updatedAt: string | null;
}

interface BrandingContextType {
  branding: WebsiteBrandingState;
  activeFaviconHref: string;
  loading: boolean;
  saveFavicon: (payload: {
    faviconDataUrl: string;
    faviconMimeType: string;
    faviconFileName: string;
    siteName?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  removeFavicon: () => Promise<{ ok: boolean; error?: string }>;
  applyBrandingLocal: (next: Partial<WebsiteBrandingState>) => void;
  refreshBranding: () => Promise<void>;
}

export const FALLBACK_FAVICON_URL = '/favicon.svg';
const BRANDING_STORAGE_KEY = 'subforge_website_branding_v1';

const DEFAULT_BRANDING: WebsiteBrandingState = {
  customFaviconDataUrl: null,
  customFaviconMimeType: null,
  customFaviconName: null,
  siteName: 'SubForge',
  updatedAt: null,
};

function loadInitialBranding(): WebsiteBrandingState {
  if (typeof window === 'undefined') return DEFAULT_BRANDING;
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_BRANDING,
        ...parsed,
      };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_BRANDING;
}

export function applyFaviconToDocument(
  customDataUrl: string | null,
  mimeType: string | null,
  siteName?: string
) {
  if (typeof document === 'undefined') return;

  const targetHref = customDataUrl || FALLBACK_FAVICON_URL;
  const targetType = customDataUrl ? mimeType || 'image/png' : 'image/svg+xml';

  const ensureLink = (id: string, rel: string, withType: boolean) => {
    let el = document.getElementById(id) as HTMLLinkElement | null;
    if (!el) {
      el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    }
    if (!el) {
      el = document.createElement('link');
      el.id = id;
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = targetHref;
    if (withType) {
      el.type = targetType;
    } else {
      el.removeAttribute('type');
    }
  };

  ensureLink('app-favicon', 'icon', true);
  ensureLink('app-shortcut-icon', 'shortcut icon', false);
  ensureLink('app-apple-touch-icon', 'apple-touch-icon', false);

  if (siteName) {
    let appNameMeta = document.querySelector('meta[name="application-name"]');
    if (!appNameMeta) {
      appNameMeta = document.createElement('meta');
      appNameMeta.setAttribute('name', 'application-name');
      document.head.appendChild(appNameMeta);
    }
    appNameMeta.setAttribute('content', siteName);
  }
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  activeFaviconHref: FALLBACK_FAVICON_URL,
  loading: true,
  saveFavicon: async () => ({ ok: false }),
  removeFavicon: async () => ({ ok: false }),
  applyBrandingLocal: () => {},
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<WebsiteBrandingState>(loadInitialBranding);
  const [loading, setLoading] = useState(true);

  const persistLocal = useCallback((next: WebsiteBrandingState) => {
    setBranding(next);
    applyFaviconToDocument(next.customFaviconDataUrl, next.customFaviconMimeType, next.siteName);
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota error
    }
  }, []);

  // Apply synchronously on initial mount
  useEffect(() => {
    applyFaviconToDocument(
      branding.customFaviconDataUrl,
      branding.customFaviconMimeType,
      branding.siteName
    );
  }, [branding]);

  const refreshBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/branding', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const serverBranding: WebsiteBrandingState = {
          customFaviconDataUrl: data.customFaviconDataUrl || null,
          customFaviconMimeType: data.customFaviconMimeType || null,
          customFaviconName: data.customFaviconName || null,
          siteName: data.siteName || 'SubForge',
          updatedAt: data.updatedAt || null,
        };
        persistLocal(serverBranding);
      }
    } catch {
      // Keep localStorage cache if offline
    } finally {
      setLoading(false);
    }
  }, [persistLocal]);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const saveFavicon = useCallback(
    async (payload: {
      faviconDataUrl: string;
      faviconMimeType: string;
      faviconFileName: string;
      siteName?: string;
    }) => {
      try {
        const res = await fetch('/api/admin/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data.error || 'Failed to save favicon on server.' };
        }
        const nextBranding: WebsiteBrandingState = {
          customFaviconDataUrl: data.branding?.customFaviconDataUrl || payload.faviconDataUrl,
          customFaviconMimeType: data.branding?.customFaviconMimeType || payload.faviconMimeType,
          customFaviconName: data.branding?.customFaviconName || payload.faviconFileName,
          siteName: data.branding?.siteName || payload.siteName || branding.siteName,
          updatedAt: data.branding?.updatedAt || new Date().toISOString(),
        };
        persistLocal(nextBranding);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Network error saving favicon.' };
      }
    },
    [branding.siteName, persistLocal]
  );

  const removeFavicon = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to remove custom favicon.' };
      }
      const nextBranding: WebsiteBrandingState = {
        ...DEFAULT_BRANDING,
        siteName: data.branding?.siteName || branding.siteName,
        updatedAt: data.branding?.updatedAt || new Date().toISOString(),
      };
      persistLocal(nextBranding);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Network error removing favicon.' };
    }
  }, [branding.siteName, persistLocal]);

  const applyBrandingLocal = useCallback(
    (next: Partial<WebsiteBrandingState>) => {
      persistLocal({ ...branding, ...next });
    },
    [branding, persistLocal]
  );

  const activeFaviconHref = branding.customFaviconDataUrl || FALLBACK_FAVICON_URL;

  return (
    <BrandingContext.Provider
      value={{
        branding,
        activeFaviconHref,
        loading,
        saveFavicon,
        removeFavicon,
        applyBrandingLocal,
        refreshBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

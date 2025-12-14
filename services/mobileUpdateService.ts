
import { MobileUpdateInfo } from "../types";

const compareVersions = (v1: string, v2: string): number => {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const val1 = v1Parts[i] || 0;
        const val2 = v2Parts[i] || 0;
        if (val1 > val2) return 1;
        if (val1 < val2) return -1;
    }
    return 0;
};

// Helper to safely append timestamp preventing double '?'
const appendTimestamp = (url: string) => {
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
};

// Helper to construct a JSDelivr URL from a GitHub Raw URL
const getJsDelivrUrl = (rawUrl: string): string | null => {
    try {
        const regex = /https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
        const match = rawUrl.match(regex);
        if (match) {
            const [, user, repo, branch, path] = match;
            return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
        }
    } catch (e) {
        console.error("Error constructing JSDelivr URL", e);
    }
    return null;
};

// Helper to construct GitHub API URL
const getGitHubApiUrl = (rawUrl: string): string | null => {
     try {
         const regex = /https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
         const match = rawUrl.match(regex);
         if (match) {
             const [, user, repo, branch, path] = match;
             return `https://api.github.com/repos/${user}/${repo}/contents/${path}?ref=${branch}`;
         }
     } catch (e) {
         console.error("Error constructing GitHub API URL", e);
     }
     return null;
};

export const checkForMobileUpdate = async (updateUrl: string, currentVersion: string): Promise<MobileUpdateInfo | null> => {
    if (!updateUrl) return null;

    // Define strategies
    const strategies = [
        {
            name: "Direct",
            getUrl: () => appendTimestamp(updateUrl),
            parse: async (res: Response) => res.json()
        },
        {
            name: "JSDelivr CDN",
            getUrl: () => {
                const cdnUrl = getJsDelivrUrl(updateUrl);
                return cdnUrl ? appendTimestamp(cdnUrl) : null;
            },
            parse: async (res: Response) => res.json()
        },
        {
            name: "GitHub API",
            getUrl: () => getGitHubApiUrl(updateUrl),
            parse: async (res: Response) => {
                const data = await res.json();
                if (data.content && data.encoding === 'base64') {
                    // GitHub API returns content in base64
                    try {
                        const decoded = atob(data.content.replace(/\n/g, ''));
                        return JSON.parse(decoded);
                    } catch (e) {
                        throw new Error("Failed to decode GitHub API response");
                    }
                }
                throw new Error("Invalid GitHub API response structure");
            }
        },
        {
            name: "CORS Proxy (AllOrigins)",
            getUrl: () => `https://api.allorigins.win/get?url=${encodeURIComponent(appendTimestamp(updateUrl))}`,
            parse: async (res: Response) => {
                const data = await res.json();
                if (!data.contents) throw new Error("No contents in AllOrigins response");
                return JSON.parse(data.contents);
            }
        },
        {
             name: "CORS Proxy (CorsProxy.io)",
             getUrl: () => `https://corsproxy.io/?${encodeURIComponent(appendTimestamp(updateUrl))}`,
             parse: async (res: Response) => res.json()
        }
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
        try {
            const url = strategy.getUrl();
            if (!url) continue;

            console.log(`Checking for updates via ${strategy.name}...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            try {
                const response = await fetch(url, { 
                    cache: 'no-store',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await strategy.parse(response);
                    
                    // Validate data structure
                    if (data && data.version && data.url) {
                        console.log(`Update check successful via ${strategy.name}`);
                        const isNewer = compareVersions(data.version, currentVersion) > 0;
                        if (isNewer) {
                            return {
                                version: data.version,
                                url: data.url,
                                notes: data.notes
                            };
                        }
                        return null; // Up to date
                    }
                } else {
                    // If 404, likely the file doesn't exist on server yet
                    if (response.status === 404 && strategy.name === "Direct") {
                         console.warn("Direct check returned 404. File might not exist.");
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        } catch (error) {
            console.warn(`Strategy ${strategy.name} failed:`, error);
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }

    // If we get here, all strategies failed
    console.error("All update check strategies failed.");
    throw lastError || new Error("No se pudo conectar con el servidor de actualizaciones.");
};

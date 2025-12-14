
import { MobileUpdateInfo } from "../types";

// Helper to remove 'v' prefix if present (e.g., v1.0.0 -> 1.0.0)
const cleanVersion = (version: string) => version.replace(/^v/, '');

const compareVersions = (v1: string, v2: string): number => {
    const v1Clean = cleanVersion(v1);
    const v2Clean = cleanVersion(v2);
    
    const v1Parts = v1Clean.split('.').map(Number);
    const v2Parts = v2Clean.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const val1 = v1Parts[i] || 0;
        const val2 = v2Parts[i] || 0;
        if (val1 > val2) return 1;
        if (val1 < val2) return -1;
    }
    return 0;
};

// Extracts owner and repo from a standard GitHub URL
const getRepoInfo = (url: string) => {
    try {
        const urlObj = new URL(url);
        // Supports: https://github.com/Owner/Repo
        if (urlObj.hostname === 'github.com') {
            const parts = urlObj.pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                return {
                    owner: parts[0],
                    repo: parts[1]
                };
            }
        }
    } catch (e) {
        console.error("Error parsing GitHub URL", e);
    }
    return null;
};

export const checkForMobileUpdate = async (repoUrl: string, currentVersion: string): Promise<MobileUpdateInfo | null> => {
    if (!repoUrl) return null;

    const repoInfo = getRepoInfo(repoUrl);
    if (!repoInfo) {
        console.warn("La URL proporcionada no es un repositorio de GitHub válido.");
        return null;
    }

    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases/latest`;

    try {
        console.log(`Checking GitHub Releases API: ${apiUrl}`);
        const response = await fetch(apiUrl, { 
            headers: { 'Accept': 'application/vnd.github.v3+json' },
            cache: 'no-cache' 
        });

        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status}`);
        }

        const data = await response.json();

        // Data structure from GitHub Releases API:
        // {
        //   "tag_name": "v1.0.61",
        //   "html_url": "https://github.com/...",
        //   "body": "Release notes...",
        //   "assets": [ { "name": "app-release.apk", "browser_download_url": "..." } ]
        // }

        if (!data.tag_name) {
            throw new Error("No tag_name found in release data");
        }

        const latestVersion = data.tag_name;
        const isNewer = compareVersions(latestVersion, currentVersion) > 0;

        if (isNewer) {
            // Try to find an APK asset
            const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
            
            // If APK exists, use its direct download link. If not, use the release page URL.
            const downloadUrl = apkAsset ? apkAsset.browser_download_url : data.html_url;

            return {
                version: cleanVersion(latestVersion),
                url: downloadUrl,
                notes: data.body || "Nueva versión disponible en GitHub Releases."
            };
        }

        return null; // Up to date

    } catch (error) {
        console.error("Update check failed:", error);
        throw error;
    }
};

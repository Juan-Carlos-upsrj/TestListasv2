
/**
 * Utility to trigger a file save or share action.
 * On mobile devices (Android/iOS), it uses the Native Share API which is more reliable.
 * on Desktops, it falls back to standard anchor tag downloads.
 */
export const saveOrShareFile = async (blob: Blob, filename: string) => {
    // Detect if we can share files (Native Share API)
    // Using typeof check to avoid TS2774 "always defined" warning
    const hasShareApi = typeof navigator.share === 'function';
    const hasCanShareApi = typeof navigator.canShare === 'function';

    let canShare = false;
    if (hasShareApi && hasCanShareApi) {
        try {
            canShare = navigator.canShare({ 
                files: [new File([blob], filename, { type: blob.type })] 
            });
        } catch (e) {
            canShare = false;
        }
    }

    if (canShare && hasShareApi) {
        try {
            const file = new File([blob], filename, { type: blob.type });
            await navigator.share({
                files: [file],
                title: filename,
                text: `Documento generado: ${filename}`
            });
            return true;
        } catch (err) {
            // User cancelled or share failed, fallback to download
            console.warn("Share failed, falling back to download", err);
        }
    }

    // Standard Download Fallback
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 200);
    
    return true;
};

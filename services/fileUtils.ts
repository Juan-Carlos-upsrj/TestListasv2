
/**
 * Utility to trigger a file save or share action.
 * On mobile devices (Android/iOS), it uses Capacitor Plugins for actual filesystem access.
 */
export const saveOrShareFile = async (blob: Blob, filename: string) => {
    // Check if we are running in a Capacitor environment
    // @ts-ignore
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform();

    if (isCapacitor) {
        try {
            // Import Capacitor plugins dynamically
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { Share } = await import('@capacitor/share');

            // 1. Convert Blob to Base64 (needed for Filesystem API)
            const base64Data = await blobToBase64(blob);

            // 2. Save file to the Data directory or Cache
            const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache // Cache is safest for immediate sharing
            });

            // 3. Share the file so the user can "Save to device" or "Send"
            await Share.share({
                title: filename,
                text: 'Documento generado desde Gestión IAEV',
                url: savedFile.uri, // This is the internal file path
                dialogTitle: 'Guardar o Compartir Reporte'
            });

            return true;
        } catch (err) {
            console.error("Capacitor Native File Error:", err);
            // If native fails, it will attempt the web fallback below
        }
    }

    // --- WEB / ELECTRON FALLBACK ---

    // Detect if we can use standard web share (Mobile Browsers but not Apps)
    const hasShareApi = typeof navigator.share === 'function';
    const hasCanShareApi = typeof navigator.canShare === 'function';

    let canShareWeb = false;
    if (hasShareApi && hasCanShareApi) {
        try {
            canShareWeb = navigator.canShare({ 
                files: [new File([blob], filename, { type: blob.type })] 
            });
        } catch (e) {
            canShareWeb = false;
        }
    }

    if (canShareWeb && hasShareApi) {
        try {
            const file = new File([blob], filename, { type: blob.type });
            await navigator.share({
                files: [file],
                title: filename,
                text: `Documento generado: ${filename}`
            });
            return true;
        } catch (err) {
            console.warn("Web Share failed, falling back to download", err);
        }
    }

    // Standard Anchor Download (Works on PC and some Android browsers, but often fails in Apps)
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 200);
    
    return true;
};

/**
 * Helper to convert a Blob to a Base64 string.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove the "data:mime/type;base64," prefix for Capacitor
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

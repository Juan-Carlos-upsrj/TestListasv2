/**
 * Fetches an image from a given URL and converts it to a Base64 Data URL.
 * This is useful for embedding images directly into documents like PDFs generated on the client-side,
 * avoiding issues with CORS or inaccessible local file paths during rendering by tools like html2canvas.
 *
 * @param {string} url The URL of the image to fetch (e.g., '/logo.png').
 * @returns {Promise<string>} A promise that resolves with the Base64 encoded string of the image.
 * If the fetch fails, it resolves with a transparent 1x1 GIF to prevent breaking the rendering process.
 */
export const getImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok for image: ${url}`);
                }
                return response.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = () => {
                     console.error('FileReader error while converting image to Base64.');
                     // Fallback to a transparent pixel
                     resolve('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error('Error fetching or converting image to Base64:', error);
                // Fallback to a transparent pixel so it doesn't break PDF generation
                resolve('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
            });
    });
};

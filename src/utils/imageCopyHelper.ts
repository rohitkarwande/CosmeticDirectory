/**
 * Copies a demo product banner image to the system clipboard as a PNG Blob.
 * Allows instant Ctrl+V pasting into WhatsApp Web / Desktop app.
 */
export async function copyProductBannerToClipboard(imageUrl: string = '/catalog.jpg'): Promise<boolean> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (err) => reject(err);
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 1200;
    canvas.height = img.naturalHeight || img.height || 675;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png', 1.0)
    );

    if (blob && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    }
  } catch (err) {
    console.warn('Failed to copy banner to clipboard:', err);
  }
  return false;
}

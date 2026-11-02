const MAX_EDGE = 1600;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

// Phone photos run to several megabytes; visitors' uploads are scaled down to a JPEG that loads quickly on the page.
export async function shrinkPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) throw new Error("Unsupported photo");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Encoding failed")), "image/jpeg", 0.85);
    });
  } finally {
    bitmap.close();
  }
}

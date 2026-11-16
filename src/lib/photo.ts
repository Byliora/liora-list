/**
 * Resize to max 1200px and re-encode as JPEG. Re-encoding through a canvas drops
 * all photo metadata (including GPS location). iPhone HEIC photos are converted
 * by Safari when picked, and createImageBitmap decodes them where supported.
 */
export async function prepareJpeg(file: File, max = 1200, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the photo");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Could not process the photo");
  return blob;
}

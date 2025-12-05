// src/lib/cloudinary.js
// Helper to upload files to Cloudinary using an unsigned upload preset.
// Requires Vite env vars: VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET

export function cloudinaryEnv() {
  return {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  };
}

export async function uploadFileToCloudinary(file) {
  const { cloudName, uploadPreset } = cloudinaryEnv();

  // Debug log so we can verify env vars are loaded in the browser/dev server
  // (do not log secrets in production)
  // eslint-disable-next-line no-console
  console.log('Cloudinary env:', { cloudName, uploadPreset });

  // If Cloudinary is not configured, fall back to a local object URL so the UI continues to work.
  if (!cloudName || !uploadPreset) {
    // eslint-disable-next-line no-console
    console.warn('Cloudinary env vars not configured; returning local object URL for preview.');
    // Return a preview URL generated from the file so the UI can still show images and save mock data.
    return URL.createObjectURL(file);
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);

  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Cloudinary upload failed: ' + txt);
  }
  const json = await res.json();
  return json.secure_url;
}

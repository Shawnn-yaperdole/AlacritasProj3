// src/lib/cloudinary.js

export function cloudinaryEnv() {
  return {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  };
}

export async function uploadFileToCloudinary(file) {
  const { cloudName, uploadPreset } = cloudinaryEnv();

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

import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'chat-attachments';
const EXPIRES_IN = 60 * 60; // 1 hour

// Cache to avoid re-signing the same URL within the session
const cache = new Map<string, { url: string; expires: number }>();

/**
 * Extract the storage path inside the chat-attachments bucket from either
 * a full public URL or an already-stored path.
 */
export function extractStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  // Already a storage path (no protocol)
  if (!value.startsWith('http')) return value;
  const marker = `/object/public/${BUCKET}/`;
  const altMarker = `/object/sign/${BUCKET}/`;
  let idx = value.indexOf(marker);
  if (idx !== -1) return value.substring(idx + marker.length).split('?')[0];
  idx = value.indexOf(altMarker);
  if (idx !== -1) return value.substring(idx + altMarker.length).split('?')[0];
  return null;
}

/**
 * Convert a stored chat-attachments value (public URL or path) to a signed URL.
 * Returns the original value if it's an external URL we can't sign.
 */
export async function getSignedAttachmentUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const path = extractStoragePath(value);
  if (!path) return value;

  const cached = cache.get(path);
  if (cached && cached.expires > Date.now() + 60_000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, EXPIRES_IN);

  if (error || !data?.signedUrl) {
    console.error('Error signing URL:', error);
    return null;
  }

  cache.set(path, {
    url: data.signedUrl,
    expires: Date.now() + EXPIRES_IN * 1000,
  });

  return data.signedUrl;
}

/**
 * Upload a file to chat-attachments and return the storage path (not public URL).
 */
export async function uploadAttachment(
  userId: string,
  file: File
): Promise<{ path: string; signedUrl: string } | null> {
  const fileExt = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    return null;
  }

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, EXPIRES_IN);

  return { path, signedUrl: data?.signedUrl || '' };
}

import { useState, useEffect } from 'react';
import { getSignedAttachmentUrl } from '@/lib/signedUrls';

/**
 * React hook that converts a stored chat-attachments value (path or public URL)
 * into a fresh signed URL.
 */
export function useSignedUrl(value: string | null | undefined): string | null {
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSigned(null);
      return;
    }
    getSignedAttachmentUrl(value).then((url) => {
      if (!cancelled) setSigned(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return signed;
}

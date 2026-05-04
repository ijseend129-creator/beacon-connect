import { useSignedUrl } from '@/hooks/useSignedUrl';
import { AudioPlayer } from './AudioPlayer';

interface SignedImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  asLink?: boolean;
}

export function SignedImage({ src, alt, className, asLink }: SignedImageProps) {
  const signed = useSignedUrl(src);
  if (!signed) {
    return <div className={className} aria-busy="true" />;
  }
  const img = <img src={signed} alt={alt || ''} className={className} />;
  if (asLink) {
    return (
      <a href={signed} target="_blank" rel="noopener noreferrer">
        {img}
      </a>
    );
  }
  return img;
}

interface SignedAudioProps {
  src: string | null | undefined;
  isSent?: boolean;
  controls?: boolean;
  autoPlay?: boolean;
  className?: string;
}

export function SignedAudio({ src, isSent, controls, autoPlay, className }: SignedAudioProps) {
  const signed = useSignedUrl(src);
  if (!signed) return null;
  if (controls) {
    return <audio src={signed} controls={controls} autoPlay={autoPlay} className={className} />;
  }
  return <AudioPlayer src={signed} isSent={!!isSent} />;
}

interface SignedDownloadLinkProps {
  src: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}

export function SignedDownloadLink({ src, children, className }: SignedDownloadLinkProps) {
  const signed = useSignedUrl(src);
  return (
    <a
      href={signed || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => {
        if (!signed) e.preventDefault();
      }}
    >
      {children}
    </a>
  );
}

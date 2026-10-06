/**
 * Video file metadata extractor and thumbnail generator.
 */

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  format: string;
}

export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    let resolved = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    const finishWithDefaults = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({
        duration: 3.5,
        width: 1920,
        height: 1080,
        filename: file.name,
        size: file.size,
        format: file.type || 'video/mp4',
      });
    };

    const timeoutId = setTimeout(finishWithDefaults, 5000);

    video.onloadedmetadata = () => {
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 3.5;
      // Seek slightly into the video to capture a meaningful frame (not black start frame)
      const seekTime = Math.min(Math.max(0.2, dur * 0.1), dur - 0.1 > 0 ? dur - 0.1 : 0.5);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);

      let thumbnailUrl: string | undefined;
      try {
        const canvas = document.createElement('canvas');
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        canvas.width = Math.min(640, w);
        canvas.height = Math.round((canvas.width / w) * h);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn('Could not generate video thumbnail frame:', err);
      }

      cleanup();
      resolve({
        duration: isFinite(video.duration) && video.duration > 0 ? +video.duration.toFixed(2) : 3.5,
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        thumbnailUrl,
        filename: file.name,
        size: file.size,
        format: file.type || 'video/mp4',
      });
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      finishWithDefaults();
    };
  });
}

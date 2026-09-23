/* What counts as a photograph or a video, and where it lives.
 *
 * Telegram's getFile will not serve anything above 20 MB, so that is the hard
 * ceiling whatever the plan. Videos are committed to the repository like
 * photographs, which is fine for short clips and expensive for long ones —
 * the bot says so rather than letting someone discover it at 300 MB. */

export const MAX_BYTES = 20 * 1024 * 1024;
export const SOFT_VIDEO_BYTES = 8 * 1024 * 1024;

export const isVideoDoc = (doc) => !!doc && /^video\//.test(doc.mime_type || '');

/* The one attachment we care about on a message, normalised. */
export function attachment(msg) {
  if (msg.photo?.length) {
    const largest = msg.photo[msg.photo.length - 1];
    return { kind: 'photo', ext: 'jpg', file_id: largest.file_id,
             uid: largest.file_unique_id, size: largest.file_size || 0 };
  }
  if (msg.video) {
    return { kind: 'video', ext: 'mp4', file_id: msg.video.file_id,
             uid: msg.video.file_unique_id, size: msg.video.file_size || 0,
             duration: msg.video.duration || 0 };
  }
  if (isVideoDoc(msg.document)) {
    return { kind: 'video', ext: 'mp4', file_id: msg.document.file_id,
             uid: msg.document.file_unique_id, size: msg.document.file_size || 0 };
  }
  if (msg.document) {
    return { kind: 'unsupported', name: msg.document.file_name || 'that file' };
  }
  return null;
}

export const isPhoto = (path) => /\.jpg$/i.test(path);
export const isVideo = (path) => /\.mp4$/i.test(path);

export const humanSize = (b) =>
  b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

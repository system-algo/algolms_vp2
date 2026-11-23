import { supabase } from '../../../supabaseClient.js';
import { getEdgeFunctionErrorMessage, toUserFacingErrorMessage } from '../../../utils/userFacingError.js';

export const MESSAGE_ATTACHMENT_BUCKET = 'message-attachments';
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_IMAGE_DIMENSION = 2000;
export const IMAGE_OPTIMIZE_THRESHOLD_BYTES = 2.5 * 1024 * 1024;
export const THUMBNAIL_MAX_DIMENSION = 480;
export const ATTACHMENT_RETENTION_DAYS = 90;
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const OPTIMIZABLE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
};

export const formatAttachmentSize = formatBytes;

export const isImageAttachment = (attachment) =>
  IMAGE_MIME_TYPES.has(String(attachment?.mime_type || attachment?.type || ''));

export const getAttachmentFingerprint = (file) =>
  [
    String(file?.name || ''),
    Number(file?.size || 0),
    String(file?.type || ''),
    Number(file?.lastModified || 0),
  ].join('|');

export const mergeAttachmentFiles = (existingFiles, incomingFiles) => {
  const existing = Array.from(existingFiles || []);
  const incoming = Array.from(incomingFiles || []);
  const seen = new Set(existing.map(getAttachmentFingerprint));
  const next = [...existing];
  let duplicateCount = 0;

  for (const file of incoming) {
    const fingerprint = getAttachmentFingerprint(file);
    if (seen.has(fingerprint)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(fingerprint);
    next.push(file);
  }

  validateAttachmentFiles(next);
  return { files: next, duplicateCount };
};

export const validateAttachmentFiles = (files) => {
  const normalized = Array.from(files || []);

  if (normalized.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new Error(
      `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files to one message.`,
    );
  }

  for (const file of normalized) {
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
      throw new Error(
        `${file.name || 'This file'} is not supported. Attach JPG, PNG, WEBP, GIF, or PDF files.`,
      );
    }
    if (!file.size || file.size < 1) {
      throw new Error(`${file.name || 'This file'} is empty.`);
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error(
        `${file.name || 'This file'} is too large. The maximum size is 10 MB per file.`,
      );
    }
  }

  return normalized;
};

const safeFileName = (value) => {
  const normalized = String(value || 'attachment')
    .normalize('NFKC')
    .replace(/[\\/]+/g, '-')
    .replace(/[^\p{L}\p{N}._()\- ]/gu, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return normalized || 'attachment';
};

const replaceExtension = (name, extension) => {
  const safe = safeFileName(name);
  const dot = safe.lastIndexOf('.');
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  return `${base.slice(0, 150)}${extension}`;
};

const getAuthenticatedUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id || '';
  if (!userId) throw new Error('You must be signed in to attach files.');
  return userId;
};

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image processing failed.'))),
      type,
      quality,
    );
  });

const loadImageSource = async (file) => {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close?.(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('The image could not be decoded.'));
  });
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(objectUrl),
  };
};

const renderImageVariant = async ({ source, width, height, maxDimension, quality, fileName }) => {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Image processing is unavailable in this browser.');
  context.drawImage(source, 0, 0, outputWidth, outputHeight);
  const blob = await canvasToBlob(canvas, 'image/webp', quality);
  return new File([blob], replaceExtension(fileName, '.webp'), {
    type: 'image/webp',
    lastModified: Date.now(),
  });
};

const prepareImageVariants = async (file) => {
  if (!OPTIMIZABLE_IMAGE_MIME_TYPES.has(file.type)) {
    // Preserve animated GIFs exactly. We intentionally do not thumbnail them,
    // because drawing a GIF to canvas would turn it into a static first frame.
    return {
      uploadFile: file,
      thumbnailFile: null,
      width: null,
      height: null,
      optimized: false,
    };
  }

  let decoded;
  try {
    decoded = await loadImageSource(file);
    const { source, width, height } = decoded;
    const shouldOptimize =
      Math.max(width, height) > MAX_IMAGE_DIMENSION ||
      file.size > IMAGE_OPTIMIZE_THRESHOLD_BYTES;

    const uploadFile = shouldOptimize
      ? await renderImageVariant({
          source,
          width,
          height,
          maxDimension: MAX_IMAGE_DIMENSION,
          quality: 0.82,
          fileName: file.name,
        })
      : file;

    const thumbnailFile = await renderImageVariant({
      source,
      width,
      height,
      maxDimension: THUMBNAIL_MAX_DIMENSION,
      quality: 0.72,
      fileName: `thumb-${file.name}`,
    });

    return {
      uploadFile,
      thumbnailFile,
      width,
      height,
      optimized: shouldOptimize,
    };
  } catch (error) {
    console.warn('Image optimization skipped:', error);
    return {
      uploadFile: file,
      thumbnailFile: null,
      width: null,
      height: null,
      optimized: false,
    };
  } finally {
    decoded?.release?.();
  }
};

const prepareAttachmentVariants = async (file) => {
  if (!isImageAttachment(file)) {
    return {
      uploadFile: file,
      thumbnailFile: null,
      width: null,
      height: null,
      optimized: false,
    };
  }
  return prepareImageVariants(file);
};

const prepareSignedUploadUrls = async (uploads) => {
  const { data, error } = await supabase.functions.invoke(
    'prepare-message-attachment-upload',
    { body: { uploads } },
  );

  if (error || data?.ok === false) {
    const message = await getEdgeFunctionErrorMessage({
      error,
      data,
      fallback: 'The file could not be prepared for upload. Please try again.',
    });
    throw new Error(message);
  }

  const prepared = Array.isArray(data?.uploads) ? data.uploads : [];
  if (prepared.length !== uploads.length) {
    throw new Error('The server did not return all upload links. Please try again.');
  }
  return prepared;
};

const uploadToSignedUrlWithProgress = ({ signedUrl, file, onProgress }) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file);
    xhr.open('PUT', signedUrl, true);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let serverMessage = '';
      try {
        const payload = JSON.parse(xhr.responseText || '{}');
        serverMessage = payload?.message || payload?.error || '';
      } catch {
        serverMessage = xhr.responseText || '';
      }
      reject(new Error(serverMessage || 'The file could not be uploaded. Please try again.'));
    };
    xhr.onerror = () => reject(new Error('The file upload was interrupted.'));
    xhr.onabort = () => reject(new Error('The file upload was cancelled.'));
    xhr.send(body);
  });

export async function uploadSinglePendingMessageAttachment(
  file,
  { userId: suppliedUserId = '', onProgress } = {},
) {
  validateAttachmentFiles([file]);

  const userId = suppliedUserId || (await getAuthenticatedUserId());
  const displayFileName = safeFileName(file.name);
  const fingerprint = getAttachmentFingerprint(file);
  const objectId = crypto.randomUUID();

  onProgress?.({ file, fingerprint, status: 'preparing', progress: 0 });

  let variants;
  try {
    variants = await prepareAttachmentVariants(file);
  } catch (error) {
    const message = toUserFacingErrorMessage(
      error,
      'The file could not be prepared for upload. Please try again.',
    );
    onProgress?.({ file, fingerprint, status: 'error', progress: 0, error: message });
    throw new Error(message);
  }

  const uploadFileName = safeFileName(variants.uploadFile.name || displayFileName);
  const storagePath = `${userId}/${objectId}/original/${uploadFileName}`;
  const thumbnailStoragePath = variants.thumbnailFile
    ? `${userId}/${objectId}/thumb/preview.webp`
    : null;

  try {
    const uploadRequests = [
      {
        path: storagePath,
        mimeType: variants.uploadFile.type || file.type,
        sizeBytes: variants.uploadFile.size,
        kind: 'original',
      },
      ...(variants.thumbnailFile && thumbnailStoragePath
        ? [{
            path: thumbnailStoragePath,
            mimeType: variants.thumbnailFile.type,
            sizeBytes: variants.thumbnailFile.size,
            kind: 'thumbnail',
          }]
        : []),
    ];
    const signedUploads = await prepareSignedUploadUrls(uploadRequests);
    const signedByKind = new Map(signedUploads.map((item) => [item.kind, item.signedUrl]));

    await uploadToSignedUrlWithProgress({
      signedUrl: signedByKind.get('original'),
      file: variants.uploadFile,
      onProgress: (progress) => {
        const weighted = variants.thumbnailFile ? Math.round(progress * 0.85) : progress;
        onProgress?.({ file, fingerprint, status: 'uploading', progress: weighted });
      },
    });

    if (variants.thumbnailFile && thumbnailStoragePath) {
      await uploadToSignedUrlWithProgress({
        signedUrl: signedByKind.get('thumbnail'),
        file: variants.thumbnailFile,
        onProgress: (progress) => {
          const weighted = 85 + Math.round(progress * 0.15);
          onProgress?.({ file, fingerprint, status: 'uploading', progress: Math.min(100, weighted) });
        },
      });
    }
  } catch (error) {
    const cleanupPaths = [storagePath, thumbnailStoragePath].filter(Boolean);
    try {
      if (cleanupPaths.length) {
        await supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).remove(cleanupPaths);
      }
    } catch (cleanupError) {
      console.warn('Failed to clean an interrupted attachment upload:', cleanupError);
    }

    const message = toUserFacingErrorMessage(
      error,
      'The file could not be uploaded. Please try again.',
    );
    onProgress?.({ file, fingerprint, status: 'error', progress: 0, error: message });
    throw new Error(message);
  }

  const attachment = {
    storage_path: storagePath,
    file_name: displayFileName,
    mime_type: variants.uploadFile.type || file.type,
    size_bytes: variants.uploadFile.size,
    original_size_bytes: file.size,
    width_px: variants.width,
    height_px: variants.height,
    thumbnail_storage_path: thumbnailStoragePath,
    thumbnail_mime_type: variants.thumbnailFile?.type || null,
    thumbnail_size_bytes: variants.thumbnailFile?.size || null,
    optimized: Boolean(variants.optimized),
    client_fingerprint: fingerprint,
  };

  onProgress?.({ file, fingerprint, status: 'uploaded', progress: 100, attachment });
  return attachment;
}

export async function uploadPendingMessageAttachments(
  files,
  { preparedAttachments = {}, onProgress } = {},
) {
  const normalizedFiles = validateAttachmentFiles(files);
  if (normalizedFiles.length === 0) return [];

  const userId = await getAuthenticatedUserId();
  const uploaded = [];

  for (const file of normalizedFiles) {
    const fingerprint = getAttachmentFingerprint(file);
    const prepared = preparedAttachments?.[fingerprint];

    if (prepared?.storage_path) {
      const existing = { ...prepared, client_fingerprint: fingerprint };
      uploaded.push(existing);
      onProgress?.({ file, fingerprint, status: 'uploaded', progress: 100, attachment: existing });
      continue;
    }

    try {
      const attachment = await uploadSinglePendingMessageAttachment(file, {
        userId,
        onProgress,
      });
      uploaded.push(attachment);
    } catch (error) {
      error.uploadedAttachments = uploaded;
      error.failedFingerprint = fingerprint;
      throw error;
    }
  }

  return uploaded;
}

export const toAttachmentRpcPayload = (attachments) =>
  (attachments || []).map((attachment) => ({
    storage_path: attachment.storage_path,
    file_name: attachment.file_name,
    mime_type: attachment.mime_type,
    size_bytes: attachment.size_bytes,
    original_size_bytes: attachment.original_size_bytes || attachment.size_bytes,
    width_px: attachment.width_px || null,
    height_px: attachment.height_px || null,
    thumbnail_storage_path: attachment.thumbnail_storage_path || null,
    thumbnail_mime_type: attachment.thumbnail_mime_type || null,
    thumbnail_size_bytes: attachment.thumbnail_size_bytes || null,
    optimized: Boolean(attachment.optimized),
  }));

export async function cleanupPendingMessageAttachments(attachments) {
  const paths = Array.from(
    new Set(
      (attachments || [])
        .flatMap((attachment) => [
          attachment?.storage_path,
          attachment?.thumbnail_storage_path,
        ])
        .filter(Boolean),
    ),
  );
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).remove(paths);
  } catch (error) {
    console.warn('Failed to clean up pending message attachments:', error);
  }
}

export async function hydrateAttachmentUrls(attachments, expiresIn = 3600) {
  const rows = attachments || [];
  const paths = [];
  for (const attachment of rows) {
    if (attachment?.expired_at) continue;
    if (attachment?.storage_path) paths.push(attachment.storage_path);
    if (attachment?.thumbnail_storage_path) paths.push(attachment.thumbnail_storage_path);
  }

  const uniquePaths = Array.from(new Set(paths));
  const signedByPath = new Map();

  if (uniquePaths.length > 0) {
    const { data, error } = await supabase.storage
      .from(MESSAGE_ATTACHMENT_BUCKET)
      .createSignedUrls(uniquePaths, expiresIn);

    if (error) {
      console.warn('Failed to sign message attachment URLs:', error);
    } else {
      uniquePaths.forEach((path, index) => {
        signedByPath.set(path, data?.[index]?.signedUrl || null);
      });
    }
  }

  return rows.map((attachment) => ({
    ...attachment,
    signed_url: attachment?.expired_at
      ? null
      : signedByPath.get(attachment?.storage_path) || null,
    thumbnail_signed_url: attachment?.expired_at
      ? null
      : signedByPath.get(attachment?.thumbnail_storage_path) || null,
  }));
}

export async function getAttachmentsForMessages({
  messageIds,
  conversationMode = 'channel',
}) {
  const ids = Array.from(new Set((messageIds || []).filter(Boolean)));
  if (ids.length === 0) return new Map();

  const foreignKey =
    conversationMode === 'direct' ? 'direct_message_id' : 'channel_message_id';

  const { data, error } = await supabase
    .from('messaging_attachments')
    .select(
      'id, channel_message_id, direct_message_id, uploader_id, storage_path, file_name, mime_type, size_bytes, original_size_bytes, width_px, height_px, thumbnail_storage_path, thumbnail_mime_type, thumbnail_size_bytes, optimized, expires_at, expired_at, retention_exempt, created_at',
    )
    .in(foreignKey, ids)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const hydrated = await hydrateAttachmentUrls(data || []);
  const byMessage = new Map();

  for (const attachment of hydrated) {
    const messageId = attachment?.[foreignKey];
    if (!messageId) continue;
    const current = byMessage.get(messageId) || [];
    current.push(attachment);
    byMessage.set(messageId, current);
  }

  return byMessage;
}

export async function hydrateSingleAttachment(attachment) {
  const [hydrated] = await hydrateAttachmentUrls(attachment ? [attachment] : []);
  return hydrated || attachment || null;
}

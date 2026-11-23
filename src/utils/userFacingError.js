const TECHNICAL_ERROR_PATTERNS = [
  /edge function returned (?:a )?non-2xx status code/i,
  /edge function returned (?:a )?2xx status code/i,
  /failed to send a request to the edge function/i,
  /functionshttperror/i,
  /functionsrelayerror/i,
  /functionsfetcherror/i,
  /failed to fetch/i,
  /networkerror/i,
  /load failed/i,
  /fetch failed/i,
  /status code\s*\d{3}/i,
  /http\s*\d{3}/i,
  /new row violates row-level security policy/i,
  /violates .* constraint/i,
  /duplicate key value/i,
  /permission denied for (?:table|relation|function|schema)/i,
  /invalid input syntax for type/i,
  /could not find the function/i,
  /schema cache/i,
  /returned invalid json/i,
  /invalid response from (?:the )?backend/i,
  /google calendar function/i,
  /google calendar http\s*\d{3}/i,
  /google calendar delete failed/i,
  /oauth secrets? (?:are|is) not configured/i,
  /supabase .*secrets?.*not configured/i,
  /\bSUPABASE_[A-Z0-9_]+\b/,
  /\bVITE_[A-Z0-9_]+\b/,
  /\bPGRST\d+\b/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
];

const cleanMessage = (value) =>
  String(value || '')
    .replace(/^error:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

const statusFromError = (error) => {
  const status = Number(
    error?.context?.status ||
      error?.status ||
      error?.statusCode ||
      0,
  );

  return Number.isFinite(status) ? status : 0;
};

const fallbackForStatus = (status, fallbackMessage) => {
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You do not have permission to complete this action.';
  }

  if (status === 404) {
    return 'This service is temporarily unavailable. Please try again.';
  }

  if (status === 408 || status === 504) {
    return 'The request took too long. Please try again.';
  }

  if (status === 409) {
    return 'This item changed while you were working. Refresh and try again.';
  }

  if (status === 429) {
    return 'Too many requests were sent at once. Please wait a moment and try again.';
  }

  if (status >= 500) {
    return 'Something went wrong on our side. Please try again.';
  }

  return fallbackMessage;
};

const looksTechnical = (message) =>
  TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));

export function toUserFacingErrorMessage(
  errorOrMessage,
  fallbackMessage = 'Something went wrong. Please try again.',
) {
  const fallback = cleanMessage(fallbackMessage) ||
    'Something went wrong. Please try again.';

  const error =
    errorOrMessage && typeof errorOrMessage === 'object'
      ? errorOrMessage
      : null;

  const message = cleanMessage(
    error ? error.message : errorOrMessage,
  );

  const status = statusFromError(error);

  if (
    message &&
    /(?:saved|created|updated|registered|cancelled|canceled).*google calendar.*(?:failed|could not)|google calendar.*(?:failed|could not).*but.*(?:saved|created|updated|registered|cancelled|canceled)/i.test(
      message,
    )
  ) {
    return 'Your change was saved, but Google Calendar could not be updated. Please retry the calendar action.';
  }

  if (!message || looksTechnical(message)) {
    return fallbackForStatus(status, fallback);
  }

  // Never show an excessively long backend/debug payload in a toast or inline error.
  if (message.length > 240) {
    return fallbackForStatus(status, fallback);
  }

  return message;
}

const parseFunctionResponse = async (context) => {
  if (!context || typeof context.clone !== 'function') {
    return null;
  }

  try {
    const response = context.clone();
    const contentType = String(
      response.headers?.get?.('content-type') || '',
    ).toLowerCase();

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    const text = cleanMessage(await response.text());
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  } catch {
    return null;
  }
};

export async function getEdgeFunctionErrorMessage({
  error,
  data,
  fallback = 'The request could not be completed. Please try again.',
} = {}) {
  const responseBody = await parseFunctionResponse(error?.context);

  const serverMessage = cleanMessage(
    data?.error ||
      data?.message ||
      responseBody?.error ||
      responseBody?.message ||
      '',
  );

  if (serverMessage) {
    const normalizedServerMessage = toUserFacingErrorMessage(
      serverMessage,
      fallback,
    );

    if (!looksTechnical(serverMessage) && serverMessage.length <= 240) {
      return normalizedServerMessage;
    }
  }

  return toUserFacingErrorMessage(error, fallback);
}

export function makeUserFacingError(message, sourceError = null) {
  const nextError = new Error(message);

  if (sourceError?.code) nextError.code = sourceError.code;
  if (sourceError?.details) nextError.details = sourceError.details;
  if (sourceError?.hint) nextError.hint = sourceError.hint;
  if (sourceError?.context) nextError.context = sourceError.context;

  return nextError;
}

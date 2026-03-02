import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

interface R2SignedUrlResponse {
  signedUrl: string;
  method: 'GET' | 'PUT';
  objectKey: string;
  expiresIn: number;
}

interface R2ListItem {
  objectKey: string;
  size: number;
  lastModified: string | null;
}

interface R2ListResponse {
  objectKey: string;
  items: R2ListItem[];
}

type R2UtilitiesAction = 'upload' | 'download' | 'delete' | 'list';

interface R2UtilitiesRequest {
  action: R2UtilitiesAction;
  objectKey: string;
  contentType?: string;
  maxKeys?: number;
}

const FUNCTION_NAME = 'r2-signed-url';
const FUNCTION_ENDPOINT = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;

const getValidAccessToken = async (forceRefresh = false): Promise<string> => {
  if (forceRefresh) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    const refreshedToken = refreshData.session?.access_token;
    if (refreshError || !refreshedToken) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }
    return refreshedToken;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const currentToken = sessionData.session?.access_token;
  if (!currentToken) {
    return getValidAccessToken(true);
  }

  const { error: userError } = await supabase.auth.getUser(currentToken);
  if (userError) {
    return getValidAccessToken(true);
  }

  return currentToken;
};

const getAuthHeader = async (forceRefresh = false): Promise<Record<string, string>> => {
  const accessToken = await getValidAccessToken(forceRefresh);

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };
};

const callR2Function = async (
  payload: R2UtilitiesRequest,
  retryOn401 = true,
  forceRefreshToken = false,
): Promise<unknown> => {
  const headers = await getAuthHeader(forceRefreshToken);
  const response = await fetch(FUNCTION_ENDPOINT, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let responseBody: unknown = null;
  let rawBody = '';
  try {
    responseBody = await response.json();
  } catch {
    try {
      rawBody = await response.text();
    } catch {
      rawBody = '';
    }
    responseBody = null;
  }

  if (!response.ok) {
    if (response.status === 401 && retryOn401) {
      await supabase.auth.refreshSession();
      return callR2Function(payload, false, true);
    }

    const message = typeof responseBody === 'object' && responseBody && 'error' in responseBody
      ? String((responseBody as { error?: unknown }).error || '')
      : rawBody.trim();
    throw new Error(message || `Edge Function returned ${response.status}`);
  }

  return responseBody;
};

const requestSignedUrl = async (
  payload: Omit<R2UtilitiesRequest, 'action'> & { action: 'upload' | 'download' },
): Promise<R2SignedUrlResponse> => {
  const data = await callR2Function(payload);

  if (!data || typeof data !== 'object' || !('signedUrl' in data) || !('method' in data)) {
    throw new Error('Resposta invalida ao solicitar URL assinada do R2');
  }

  const response = data as R2SignedUrlResponse;
  if (!response.signedUrl || !response.method || !response.objectKey) {
    throw new Error('Resposta incompleta ao solicitar URL assinada do R2');
  }

  return response;
};

export const listUtilityObjectsFromR2 = async (prefix: string, maxKeys = 500): Promise<R2ListItem[]> => {
  const data = await callR2Function({ action: 'list', objectKey: prefix, maxKeys });
  if (!data || typeof data !== 'object' || !('items' in data)) {
    throw new Error('Resposta invalida ao listar objetos de utilitarios no R2');
  }

  const response = data as R2ListResponse;
  return Array.isArray(response.items) ? response.items : [];
};

export const uploadUtilityBlobToR2Signed = async (
  objectKey: string,
  blob: Blob,
  contentType = 'application/octet-stream',
): Promise<void> => {
  const signed = await requestSignedUrl({
    action: 'upload',
    objectKey,
    contentType,
  });

  const uploadResponse = await fetch(signed.signedUrl, {
    method: signed.method,
    headers: {
      'Content-Type': contentType,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    let details = '';
    try {
      details = (await uploadResponse.text()).trim();
    } catch {
      details = '';
    }
    throw new Error(`Falha no upload para R2 (${uploadResponse.status})${details ? `: ${details}` : ''}`);
  }
};

export const downloadUtilityBlobFromR2Signed = async (objectKey: string): Promise<Blob> => {
  const signed = await requestSignedUrl({
    action: 'download',
    objectKey,
  });

  const downloadResponse = await fetch(signed.signedUrl, {
    method: signed.method,
  });

  if (!downloadResponse.ok) {
    throw new Error(`Falha no download do R2 (${downloadResponse.status})`);
  }

  return await downloadResponse.blob();
};

export const deleteUtilityObjectFromR2 = async (objectKey: string): Promise<void> => {
  await callR2Function({
    action: 'delete',
    objectKey,
  });
};

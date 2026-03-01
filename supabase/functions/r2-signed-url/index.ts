// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from 'npm:@aws-sdk/client-s3@3.726.1';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.726.1';

type Action = 'upload' | 'download' | 'delete';

interface SignedUrlRequest {
  action: Action;
  objectKey: string;
  contentType?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });

const getRequiredEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isAllowedObjectKey = (key: string): boolean => {
  if (!key || key.length > 1024) return false;
  if (key.includes('..') || key.includes('\\')) return false;
  return key.startsWith('user/') || key.startsWith('org/');
};

const canAccessObjectKey = async (
  objectKey: string,
  userId: string,
  admin: ReturnType<typeof createClient>,
): Promise<boolean> => {
  if (objectKey.startsWith(`user/${userId}/`)) return true;

  if (!objectKey.startsWith('org/')) return false;
  const parts = objectKey.split('/');
  const orgId = parts[1] || '';
  if (!isUuid(orgId)) return false;

  const { data, error } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('r2-signed-url org access check failed:', error);
    return false;
  }

  return !!data;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const supabaseAnonKey = getRequiredEnv('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json(401, { error: 'Missing Bearer token' });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json(401, { error: 'Invalid auth token' });
    }

    const body = (await req.json()) as SignedUrlRequest;
    const action = body?.action;
    const objectKey = String(body?.objectKey || '').trim();
    const contentType = String(body?.contentType || 'video/mp4').trim();

    if (!action || !['upload', 'download', 'delete'].includes(action)) {
      return json(400, { error: 'Invalid action' });
    }

    if (!isAllowedObjectKey(objectKey)) {
      return json(400, { error: 'Invalid objectKey' });
    }

    const canAccess = await canAccessObjectKey(objectKey, userData.user.id, adminClient);
    if (!canAccess) {
      return json(403, { error: 'Forbidden objectKey scope' });
    }

    const bucket = getRequiredEnv('R2_BUCKET').toLowerCase();
    const endpoint = getRequiredEnv('R2_ENDPOINT');
    const accessKeyId = getRequiredEnv('R2_ACCESS_KEY_ID');
    const secretAccessKey = getRequiredEnv('R2_SECRET_ACCESS_KEY');
    const expiresIn = Number(Deno.env.get('R2_SIGNED_URL_TTL_SECONDS') || '300');

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    if (action === 'delete') {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
      return json(200, { success: true, deleted: true, objectKey });
    }

    if (action === 'upload') {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType || 'video/mp4',
      });
      const signedUrl = await getSignedUrl(s3, command, { expiresIn });

      return json(200, {
        signedUrl,
        method: 'PUT',
        objectKey,
        expiresIn,
      });
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn });

    return json(200, {
      signedUrl,
      method: 'GET',
      objectKey,
      expiresIn,
    });
  } catch (err) {
    console.error('r2-signed-url error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return json(500, { error: message });
  }
});

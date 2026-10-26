import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AuthError } from "@/modules/auth/request-security";

let client: S3Client | null = null;

function configuration() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new AuthError("STORAGE_NOT_CONFIGURED", "Private file storage is not configured yet.", 503);
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, bucket };
}

export async function createPrivateUploadUrl(objectKey: string, contentType: string) {
  const { client: r2, bucket } = configuration();
  return getSignedUrl(r2, new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType }), { expiresIn: 10 * 60 });
}

export async function inspectPrivateObject(objectKey: string) {
  const { client: r2, bucket } = configuration();
  const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
  const sample = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey, Range: "bytes=0-511" }));
  const bytes = sample.Body ? new Uint8Array(await sample.Body.transformToByteArray()) : new Uint8Array();
  return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? "", checksum: head.ChecksumSHA256 ?? null, bytes };
}

export async function createPrivateDownloadUrl(objectKey: string, fileName: string, preview: boolean) {
  const { client: r2, bucket } = configuration();
  const disposition = preview ? "inline" : `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: objectKey, ResponseContentDisposition: disposition }), { expiresIn: 5 * 60 });
}

export async function deletePrivateObject(objectKey: string) {
  const { client: r2, bucket } = configuration();
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}

export function resetR2ClientForTests() { client = null; }

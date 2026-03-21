import { HttpAgent } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { StorageClient } from "./StorageClient";

/**
 * Upload raw bytes to blob storage and return a direct URL.
 * Falls back gracefully: if blob storage is unavailable or not configured,
 * returns null so callers can keep the base64 data URL as fallback.
 */
export async function uploadBytesToBlob(
  bytes: Uint8Array,
  onProgress?: (pct: number) => void,
): Promise<string | null> {
  try {
    const config = await loadConfig();

    // "nogateway" means blob storage is not configured — skip upload
    if (
      !config.storage_gateway_url ||
      config.storage_gateway_url === "nogateway"
    ) {
      return null;
    }

    const agent = new HttpAgent({ host: config.backend_host });
    if (config.backend_host?.includes("localhost")) {
      await agent.fetchRootKey().catch(() => {});
    }

    const storageClient = new StorageClient(
      config.bucket_name,
      config.storage_gateway_url,
      config.backend_canister_id,
      config.project_id,
      agent,
    );

    const { hash } = await storageClient.putFile(bytes, onProgress);
    const url = await storageClient.getDirectURL(hash);
    return url;
  } catch (err) {
    console.warn("[blobUpload] Upload failed, keeping local data:", err);
    return null;
  }
}

/**
 * Convert a base64 data URL to Uint8Array bytes.
 */
export async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const resp = await fetch(dataUrl);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Convert a File object to Uint8Array bytes.
 */
export async function fileToBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

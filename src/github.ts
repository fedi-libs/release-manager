export async function verifyGithubSignature(
  signature: string | undefined, 
  body: ArrayBuffer, 
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigHex = signature.replace("sha256=", "");
  const sigArray = new Uint8Array(
    sigHex.match(/.{2}/g)?.map((b) => parseInt(b, 16)) || []
  );

  return await crypto.subtle.verify("HMAC", key, sigArray, body);
}

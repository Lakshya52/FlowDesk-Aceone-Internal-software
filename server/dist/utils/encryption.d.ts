/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: `iv:authTag:ciphertext` (all hex).
 * If the input is empty or falsy, returns it unchanged.
 */
export declare function encrypt(plaintext: string): string;
/**
 * Decrypt an encrypted string produced by `encrypt()`.
 * Gracefully returns the input unchanged if it doesn't match the
 * encrypted format (e.g. legacy plaintext messages).
 */
export declare function decrypt(ciphertext: string): string;
//# sourceMappingURL=encryption.d.ts.map
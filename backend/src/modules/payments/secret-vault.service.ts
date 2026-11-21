import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const KEY_CONTEXT = 'metrispot.payment-gateway.vault.v1';

/**
 * AES-256-GCM encryption for gateway secrets at rest. The key comes from
 * PAYMENT_ENCRYPTION_KEY when configured and is otherwise derived from the
 * application's JWT_SECRET (same trust boundary, different context string), so
 * credentials are never stored as plaintext even before the dedicated key is set.
 *
 * Format: v1:<iv>.<tag>.<ciphertext> (base64).
 */
@Injectable()
export class SecretVaultService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const provided = config.get<string>('PAYMENT_ENCRYPTION_KEY');
    const material = provided && provided.length >= 16 ? provided : config.getOrThrow<string>('JWT_SECRET');
    this.key = scryptSync(material, KEY_CONTEXT, 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [version, body] = payload.split(':', 2);
    if (version !== 'v1' || !body) throw new Error('Unsupported gateway secret envelope');
    const [iv, tag, ciphertext] = body.split('.');
    if (!iv || !tag || !ciphertext) throw new Error('Malformed gateway secret envelope');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  /** Decrypts a stored credential blob, or returns an empty bag when it is absent/corrupt. */
  open(payload: string | null | undefined): Record<string, string> {
    if (!payload) return {};
    try {
      const parsed: unknown = JSON.parse(this.decrypt(payload));
      if (typeof parsed !== 'object' || parsed === null) return {};
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      );
    } catch {
      // A rotated/lost key must not crash the API: the gateway simply reads as unconfigured.
      return {};
    }
  }

  seal(credentials: Record<string, string>): string {
    return this.encrypt(JSON.stringify(credentials));
  }
}

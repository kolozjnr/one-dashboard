import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const KEY_CONTEXT = 'metrispot.integrations.vault.v1';

/**
 * AES-256-GCM encryption for OAuth tokens at rest (ConnectedAccount
 * .credentialsCiphertext). Separate key context from the payment vault so a
 * credential bag can never be decrypted with the other domain's key, while
 * reusing the same material chain documented in backend/docs/data-model.md:
 * INTEGRATIONS_ENCRYPTION_KEY when configured, else PAYMENT_ENCRYPTION_KEY,
 * else a scrypt derivation of JWT_SECRET — tokens are never stored plaintext
 * even before the dedicated key is set.
 *
 * Format: v1:<iv>.<tag>.<ciphertext> (base64), same envelope as the payment
 * vault so operational tooling can treat both identically.
 */
@Injectable()
export class IntegrationsVaultService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const pick = (value: string | undefined): string => (value && value.trim().length >= 16 ? value.trim() : '');
    const provided =
      pick(config.get<string>('INTEGRATIONS_ENCRYPTION_KEY')) ||
      pick(config.get<string>('PAYMENT_ENCRYPTION_KEY'));
    const material = provided || config.getOrThrow<string>('JWT_SECRET');
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
    if (version !== 'v1' || !body) throw new Error('Unsupported integration secret envelope');
    const [iv, tag, ciphertext] = body.split('.');
    if (!iv || !tag || !ciphertext) throw new Error('Malformed integration secret envelope');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  /** Decrypts a stored credential bag, or an empty bag when absent/corrupt. */
  open(payload: string | null | undefined): Record<string, string> {
    if (!payload) return {};
    try {
      const parsed: unknown = JSON.parse(this.decrypt(payload));
      if (typeof parsed !== 'object' || parsed === null) return {};
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
    } catch {
      // A rotated/lost key must not crash the API: the account reads as
      // needing re-authorization instead.
      return {};
    }
  }

  seal(credentials: Record<string, string>): string {
    return this.encrypt(JSON.stringify(credentials));
  }
}

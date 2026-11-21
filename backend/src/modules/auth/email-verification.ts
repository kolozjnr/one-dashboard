import type { ConfigService } from '@nestjs/config';

// EMAIL_VERIFICATION_REQUIRED=false lifts the email-verification gate on login,
// session validation and token refresh — for development/testing until real
// email delivery is in place (sandbox SMTP captures the links). Unset or any
// value other than "false" keeps verification mandatory, so production stays
// secure by default without extra configuration.
export function emailVerificationRequired(config: ConfigService): boolean {
  return config.get<string>('EMAIL_VERIFICATION_REQUIRED') !== 'false';
}

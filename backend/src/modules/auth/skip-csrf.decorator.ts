import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skip_csrf';

/**
 * Marks a route as exempt from CSRF validation. Only safe for machine-to-machine
 * endpoints (gateway webhooks) that authenticate with a provider signature instead of
 * a browser session — never for cookie-authenticated routes.
 */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

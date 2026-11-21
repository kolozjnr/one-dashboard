import { GatewayError, type GatewayProviderKey, type PaymentGatewayAdapter } from './gateway.types';
import { PaystackAdapter } from './gateways/paystack.adapter';
import { FlutterwaveAdapter } from './gateways/flutterwave.adapter';
import { StripeAdapter } from './gateways/stripe.adapter';

// Adapters are stateless: they receive decrypted credentials per call and never touch
// the database, so a single instance per provider is enough. The registry is the only
// place that maps a provider key to an implementation.
const ADAPTERS: Record<GatewayProviderKey, PaymentGatewayAdapter> = {
  paystack: new PaystackAdapter(),
  flutterwave: new FlutterwaveAdapter(),
  stripe: new StripeAdapter(),
};

export function adapterFor(key: string): PaymentGatewayAdapter {
  const adapter = ADAPTERS[key as GatewayProviderKey];
  if (!adapter) throw new GatewayError('NOT_CONFIGURED', `No payment gateway adapter is registered for "${key}"`);
  return adapter;
}

export function registeredAdapters(): PaymentGatewayAdapter[] {
  return Object.values(ADAPTERS);
}

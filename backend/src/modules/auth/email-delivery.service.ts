import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);
  private readonly transport: Transporter | null;
  private readonly from: string | null;

  constructor(private readonly config: ConfigService) {
    const url = config.get<string>('SMTP_URL');
    this.from = config.get<string>('EMAIL_FROM') ?? null;
    this.transport = url ? nodemailer.createTransport(url) : null;
  }

  assertReady(): void {
    if (!this.transport || !this.from) {
      throw new ServiceUnavailableException({
        code: 'EMAIL_DELIVERY_UNAVAILABLE',
        message: 'Email delivery is not configured',
        details: [],
      });
    }
  }

  async sendVerification(email: string, token: string): Promise<void> {
    const url = new URL('/verify-email', this.config.getOrThrow<string>('APP_BASE_URL'));
    url.searchParams.set('token', token);
    await this.send(email, 'Verify your Metrispot email', `Verify your email address: ${url.toString()}`);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const url = new URL('/reset-password', this.config.getOrThrow<string>('APP_BASE_URL'));
    url.searchParams.set('token', token);
    await this.send(email, 'Reset your Metrispot password', `Reset your password: ${url.toString()}`);
  }

  async sendInvitation(email: string, workspace: string, token: string): Promise<void> {
    const url = new URL(`/invitations/accept/${encodeURIComponent(token)}`, this.config.getOrThrow<string>('APP_BASE_URL'));
    await this.send(email, `Invitation to ${workspace}`, `Accept your workspace invitation: ${url.toString()}`);
  }

  async send(email: string, subject: string, text: string): Promise<void> {
    this.assertReady();
    try {
      await this.transport!.sendMail({ from: this.from!, to: email, subject, text });
    } catch {
      this.logger.warn('Email delivery failed; request token remains available for resend.');
      throw new ServiceUnavailableException({
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'Email delivery is temporarily unavailable',
        details: [],
      });
    }
  }
}

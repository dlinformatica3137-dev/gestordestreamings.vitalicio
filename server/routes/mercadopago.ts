import { Router, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { db } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from './auth.ts';

export const mpRouter = Router();

function getMpAccessToken(): string {
  const settings = db.getSystemSettings();
  return (settings.mp_access_token || process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
}

function getMpWebhookSecret(): string {
  const settings = db.getSystemSettings();
  return (settings.mp_webhook_secret || process.env.MERCADO_PAGO_WEBHOOK_SECRET || '').trim();
}

async function generateQrDataUrl(code: string, base64FromMp?: string): Promise<string> {
  if (base64FromMp && base64FromMp.trim()) {
    return base64FromMp.startsWith('data:') ? base64FromMp : `data:image/png;base64,${base64FromMp}`;
  }
  if (!code) return '';
  try {
    return await QRCode.toDataURL(code, {
      width: 320,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  } catch (err) {
    console.warn('Erro ao gerar imagem QRCode do Pix:', err);
    return '';
  }
}

// POST /api/license/create-preference - Generate Mercado Pago preference / Pix for SaaS License
mpRouter.post('/create-preference', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const user = req.user;
  const settings = db.getSystemSettings();
  const amount = settings.lifetime_price || 199.00;
  const transactionId = `tx_${Date.now()}`;
  const token = getMpAccessToken();
  const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

  // If real MP_ACCESS_TOKEN is configured in Super Admin or environment, call Mercado Pago API
  if (token && token.startsWith('APP_USR-')) {
    let pixQrCode = '';
    let pixQrCodeBase64 = '';
    let mpPaymentId = '';
    let preferenceId = '';
    let initPoint = '';
    let sandboxInitPoint = '';

    // 1. Generate direct Pix payment via Mercado Pago API
    try {
      const pixRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${tenantId}-${transactionId}`
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: 'Gestor de Streamings - Licença Vitalícia',
          payment_method_id: 'pix',
          payer: {
            email: user.email || 'contato@gestorstream.com',
            first_name: user.full_name?.split(' ')[0] || 'Cliente',
            last_name: user.full_name?.split(' ').slice(1).join(' ') || 'SaaS'
          },
          external_reference: `${tenantId}:${transactionId}`,
          notification_url: `${appUrl}/api/license/webhook`
        })
      });

      if (pixRes.ok) {
        const pixData = await pixRes.json();
        mpPaymentId = String(pixData.id);
        pixQrCode = pixData.point_of_interaction?.transaction_data?.qr_code || '';
        pixQrCodeBase64 = pixData.point_of_interaction?.transaction_data?.qr_code_base64 || '';
      } else {
        const errJson = await pixRes.json().catch(() => ({}));
        console.warn('Mercado Pago direct Pix notice:', errJson);
      }
    } catch (pixErr: any) {
      console.warn('Erro ao chamar API de Pix do Mercado Pago:', pixErr?.message);
    }

    // 2. Generate Checkout Pro preference (Cartão / Boleto / Saldo MP)
    try {
      const preferencePayload = {
        items: [
          {
            id: 'licenca_vitalicia_gestor_stream',
            title: 'Gestor de Streamings — Licença Vitalícia',
            description: 'Acesso vitalício completo ao software SaaS Gestor de Streamings',
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL'
          }
        ],
        payer: {
          name: user.full_name,
          email: user.email,
          phone: {
            number: user.phone || '11999998888'
          }
        },
        external_reference: `${tenantId}:${transactionId}`,
        back_urls: {
          success: `${appUrl}/?payment=success&tx=${transactionId}`,
          pending: `${appUrl}/?payment=pending&tx=${transactionId}`,
          failure: `${appUrl}/?payment=failure&tx=${transactionId}`
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/license/webhook`
      };

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferencePayload)
      });

      if (mpResponse.ok) {
        const data = await mpResponse.json();
        preferenceId = data.id;
        initPoint = data.init_point;
        sandboxInitPoint = data.sandbox_init_point;
      }
    } catch (prefErr: any) {
      console.warn('Erro ao criar preferência de Checkout:', prefErr?.message);
    }

    if (pixQrCode || preferenceId) {
      const tx = db.addTransaction({
        id: transactionId,
        tenant_id: tenantId,
        mp_preference_id: preferenceId || `pref_${transactionId}`,
        mp_payment_id: mpPaymentId || undefined,
        amount: amount,
        status: 'pending',
        payment_method: pixQrCode ? 'Pix Oficial Mercado Pago' : 'Mercado Pago Checkout',
        pix_code: pixQrCode || undefined,
        init_point: initPoint || undefined,
        sandbox_init_point: sandboxInitPoint || undefined,
        created_at: new Date().toISOString()
      });

      const qrImage = await generateQrDataUrl(pixQrCode, pixQrCodeBase64);

      return res.json({
        preferenceId: preferenceId || `pref_${transactionId}`,
        initPoint: initPoint || `${appUrl}/checkout/${transactionId}`,
        sandboxInitPoint,
        pixCode: pixQrCode,
        qrCodeBase64: qrImage,
        paymentId: mpPaymentId,
        amount: amount,
        transaction: tx,
        isConfigured: true
      });
    }
  }

  // Pre-configured fallback Pix Copy & Paste when credentials are in setup/sandbox mode
  const pixCopyPaste = `00020101021226840014br.gov.bcb.pix2562pix-gestor.streamings.com/qr/v2/${transactionId}5204000053039865406199.005802BR5925GESTOR DE STREAMINGS SAAS6009SAO PAULO62070503***6304${Math.random().toString(16).substring(2, 6).toUpperCase()}`;

  const tx = db.addTransaction({
    id: transactionId,
    tenant_id: tenantId,
    mp_preference_id: `pref_${transactionId}`,
    amount: amount,
    status: 'pending',
    payment_method: 'Pix / Mercado Pago',
    pix_code: pixCopyPaste,
    created_at: new Date().toISOString()
  });

  const qrImage = await generateQrDataUrl(pixCopyPaste);

  return res.json({
    preferenceId: `pref_${transactionId}`,
    initPoint: `${appUrl}/checkout/${transactionId}`,
    pixCode: pixCopyPaste,
    qrCodeBase64: qrImage,
    amount: amount,
    transaction: tx,
    isConfigured: Boolean(token && token.startsWith('APP_USR-'))
  });
});

// POST /api/license/webhook - Real Mercado Pago IPN & Webhook handler
mpRouter.post('/webhook', async (req, res) => {
  const { topic, resource, id, data, type } = req.body || {};
  const query = req.query;

  // Mercado Pago sends notifications either via query params or body:
  const paymentId = id || (data && data.id) || query['data.id'] || query.id;
  const notificationType = type || topic || query.type || query.topic;

  console.log(`[Mercado Pago Webhook Received] Type: ${notificationType}, ID: ${paymentId}`);

  const webhookSecret = getMpWebhookSecret();
  const token = getMpAccessToken();

  // Validate webhook signature if webhookSecret is provided
  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;

  if (webhookSecret && xSignature) {
    try {
      const parts = xSignature.split(',');
      let ts = '';
      let v1 = '';
      parts.forEach((p) => {
        const [k, v] = p.split('=');
        if (k.trim() === 'ts') ts = v.trim();
        if (k.trim() === 'v1') v1 = v.trim();
      });

      const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
      const expectedHash = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

      if (expectedHash !== v1) {
        console.warn('Mercado Pago Webhook signature mismatch.');
      }
    } catch (e) {
      console.error('Error validating signature:', e);
    }
  }

  // If we have an Access Token, verify transaction directly against Mercado Pago API
  if (paymentId && token) {
    try {
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        const status = paymentData.status;
        const extRef = paymentData.external_reference; // format: tenantId:transactionId

        if (extRef && status === 'approved') {
          const [tenantId, txId] = extRef.split(':');
          if (tenantId) {
            db.updateTransactionStatus(txId, 'approved', String(paymentId));
            db.activateLifetimeLicense(tenantId, String(paymentId));
            console.log(`[Webhook Activated] Lifetime license granted to tenant ${tenantId}`);
          }
        }
      }
    } catch (err) {
      console.error('Error verifying payment at Mercado Pago API:', err);
    }
  }

  return res.status(200).send('OK');
});

// POST /api/license/simulate-payment - For testing & sandbox verification
mpRouter.post('/simulate-payment', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { transactionId } = req.body;

  const txId = transactionId || `tx_${Date.now()}`;
  const paymentId = `mp_pay_${Math.floor(Math.random() * 900000000 + 100000000)}`;

  db.updateTransactionStatus(txId, 'approved', paymentId);
  const updatedLicense = db.activateLifetimeLicense(tenantId, paymentId);

  return res.json({
    message: 'Pagamento de R$ 199,00 aprovado com sucesso! Licença vitalícia ativada.',
    license: updatedLicense,
    transactionId: txId,
    mpPaymentId: paymentId
  });
});

// GET /api/license/status - License status check
mpRouter.get('/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const license = db.getLicense(req.tenantId!);
  const transactions = db.getTransactions(req.tenantId!);
  return res.json({ license, transactions });
});

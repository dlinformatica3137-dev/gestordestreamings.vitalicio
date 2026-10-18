import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db.ts';

export const authRouter = Router();

// Simple JWT-like bearer token generator and parser
export interface AuthenticatedRequest extends Request {
  user?: any;
  tenantId?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Token format: base64 encoded { userId, tenantId, timestamp }
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const user = db.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
    req.user = user;
    req.tenantId = user.tenant_id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token de autenticação inválido.' });
  }
}

export function generateToken(user: any): string {
  const payload = {
    userId: user.id,
    tenantId: user.tenant_id,
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// POST /api/auth/register
authRouter.post('/register', (req, res) => {
  const { full_name, company_name, email, phone, password, confirm_password, terms_accepted, fingerprint } = req.body;

  // 1. Nome Obrigatório
  if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
    return res.status(400).json({ error: 'O Nome Completo é obrigatório para criar sua conta de teste.' });
  }

  // 2. E-mail Obrigatório
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'O E-mail é obrigatório para criar sua conta de teste.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Informe um endereço de e-mail válido (ex: contato@email.com).' });
  }

  // 3. Número de WhatsApp Obrigatório
  const cleanPhone = (phone ? String(phone) : '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({ error: 'O Número de WhatsApp é obrigatório com DDD (mínimo 10 dígitos, ex: 11999998888).' });
  }

  // 4. Senha Obrigatória
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'A Senha é obrigatória e deve ter no mínimo 6 caracteres.' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ error: 'As senhas digitadas não coincidem.' });
  }

  if (!terms_accepted) {
    return res.status(400).json({ error: 'É necessário aceitar os termos de uso e política de privacidade.' });
  }

  const existing = db.findUserByEmail(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema.' });
  }

  const effectiveCompany = (company_name && typeof company_name === 'string' && company_name.trim())
    ? company_name.trim()
    : full_name.trim();

  try {
    const { user, license } = db.createUser({
      email: cleanEmail,
      full_name: full_name.trim(),
      company_name: effectiveCompany,
      phone: cleanPhone,
      password,
      fingerprint
    });

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;

    return res.status(201).json({
      message: 'Conta criada com sucesso! Teste de 3 dias grátis ativado.',
      token,
      user: safeUser,
      license
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao criar conta.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe o e-mail e a senha.' });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const isValid = db.verifyPassword(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const license = db.getLicense(user.tenant_id);
  const token = generateToken(user);
  const { password_hash, ...safeUser } = user;

  return res.json({
    message: 'Login realizado com sucesso.',
    token,
    user: safeUser,
    license
  });
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user;
  const license = db.getLicense(req.tenantId!);
  const { password_hash, ...safeUser } = user;

  return res.json({
    user: safeUser,
    license
  });
});

// POST /api/auth/recover-password
authRouter.post('/recover-password', (req, res) => {
  const { email, new_password, confirm_new_password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Informe seu e-mail cadastrado.' });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const user = db.findUserByEmail(cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'Nenhum cadastro localizado com este e-mail.' });
  }

  if (new_password) {
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }
    if (confirm_new_password && new_password !== confirm_new_password) {
      return res.status(400).json({ error: 'As confirmações de senha não coincidem.' });
    }
    db.changePassword(user.id, new_password);
    return res.json({
      success: true,
      message: 'Senha alterada com sucesso! Você já pode entrar com sua nova senha.'
    });
  }

  // Generate temporary password as fallback
  const tempPass = Math.random().toString(36).substring(2, 8) + 'A1!';
  db.changePassword(user.id, tempPass);

  return res.json({
    message: 'Senha redefinida com sucesso!',
    temp_password_info: `Nova senha gerada: ${tempPass}`
  });
});

// PUT /api/auth/profile
authRouter.put('/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { full_name, company_name, phone } = req.body;
  const updated = db.updateProfile(req.tenantId!, req.user.id, { full_name, company_name, phone });
  if (!updated) {
    return res.status(404).json({ error: 'Perfil não encontrado.' });
  }
  const { password_hash, ...safeUser } = updated;
  return res.json({ user: safeUser, message: 'Perfil atualizado com sucesso.' });
});

// PUT /api/auth/change-password
authRouter.put('/change-password', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { current_password, new_password, confirm_new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  if (new_password !== confirm_new_password) {
    return res.status(400).json({ error: 'As novas senhas não coincidem.' });
  }

  const isValid = db.verifyPassword(current_password, req.user.password_hash);
  if (!isValid) {
    return res.status(400).json({ error: 'Senha atual incorreta.' });
  }

  db.changePassword(req.user.id, new_password);
  return res.json({ message: 'Senha alterada com sucesso.' });
});

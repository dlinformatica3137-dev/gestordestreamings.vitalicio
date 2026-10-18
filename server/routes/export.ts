import { Router, Response } from 'express';
import * as XLSX from 'xlsx';
import { db } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from './auth.ts';

export const exportRouter = Router();

// GET /api/export/customers?format=xlsx|csv&filter=all|active|overdue|upcoming
exportRouter.get('/customers', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const format = (req.query.format as string) || 'csv';
  const filterType = (req.query.filter as string) || 'all';

  const todayStr = new Date().toISOString().split('T')[0];
  let customers = db.getCustomers(tenantId);
  const charges = db.getCharges(tenantId);

  // Apply filters
  if (filterType === 'active') {
    customers = customers.filter((c) => c.status === 'active');
  } else if (filterType === 'overdue') {
    customers = customers.filter((c) => c.status === 'overdue' || c.due_date < todayStr);
  } else if (filterType === 'upcoming') {
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split('T')[0];
    customers = customers.filter((c) => c.due_date >= todayStr && c.due_date <= next7DaysStr);
  }

  // Format data with clear Portuguese column names
  const exportData = customers.map((c) => {
    // Find customer financial status
    const customerCharges = charges.filter((ch) => ch.customer_id === c.id);
    const hasOverdue = customerCharges.some((ch) => ch.status === 'overdue' || (ch.status === 'pending' && ch.due_date < todayStr));
    const financialStatus = hasOverdue ? 'Inadimplente / Em Atraso' : 'Em Dia';

    const formattedDueDate = c.due_date ? new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    const formattedFee = `R$ ${Number(c.monthly_fee || 0).toFixed(2).replace('.', ',')}`;

    return {
      'Nome do Cliente': c.full_name,
      'Telefone': c.phone,
      'WhatsApp': c.whatsapp || c.phone,
      'E-mail': c.email || '',
      'CPF': c.cpf || '',
      'Aplicativo / Serviço': c.app_name || '',
      'Plano Contratado': c.plan_name || '',
      'Valor do Plano': formattedFee,
      'Data de Vencimento': formattedDueDate,
      'Forma de Pagamento': c.payment_method || 'Pix',
      'Status do Cliente': c.status === 'active' ? 'Ativo' : c.status === 'overdue' ? 'Vencido' : 'Inativo',
      'Situação Financeira': financialStatus,
      'Observações': c.notes || ''
    };
  });

  const filename = `relatorio_clientes_${filterType}_${new Date().toISOString().split('T')[0]}`;

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(buffer);
  } else {
    // CSV output with UTF-8 BOM so Excel opens accented characters like 'Situação' perfectly
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const bom = '\uFEFF';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(bom + csvContent);
  }
});

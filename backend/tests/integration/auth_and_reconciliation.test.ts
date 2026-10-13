import request from 'supertest';
import app from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { Organization } from '../../src/models/Organization';
import { User } from '../../src/models/User';
import { Invoice } from '../../src/models/Invoice';
import { ReconciliationEngine } from '../../src/modules/reconciliation/reconciliationEngine';

describe('Integration Test: Auth & Autonomous Reconciliation Engine', () => {
  beforeAll(async () => {
    await connectDatabase();
    await Promise.all([Organization.deleteMany({}), User.deleteMany({}), Invoice.deleteMany({})]);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  let authToken = '';
  let organizationId: any;
  let userId: any;

  test('POST /api/v1/auth/register - registers tenant and returns JWT', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test Finance Officer',
      email: 'test.finance@gsttest.com',
      password: 'SecurePassword123!',
      role: 'FINANCE_MANAGER',
      organizationName: 'Precision Tools Ltd',
      organizationGstin: '27AABCU9603R1ZM',
      state: '27-Maharashtra',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('FINANCE_MANAGER');

    authToken = res.body.token;
    organizationId = res.body.user.organizationId;
    userId = res.body.user.id;
  });

  test('GET /api/v1/auth/me - retrieves current user profile with token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test.finance@gsttest.com');
  });

  test('Executes 10-stage reconciliation and produces deterministic results', async () => {
    // Insert 1 exact match pair and 1 missing in 2b invoice
    const prInvoice = await Invoice.create({
      organizationId,
      importJobId: organizationId,
      sourceDataset: 'PURCHASE_REGISTER',
      supplierGstin: '27AABCU9603R1ZM',
      supplierName: 'Apex Logistics',
      invoiceNumber: 'INV-001',
      normalizedInvoiceNumber: 'INV1',
      invoiceDate: new Date('2024-08-10'),
      documentType: 'INVOICE',
      taxableValue: 100000,
      cgst: 0,
      sgst: 0,
      igst: 18000,
      cess: 0,
      totalAmount: 118000,
      itcEligibility: 'ELIGIBLE',
      filingPeriod: '2024-Q3',
      reconciliationStatus: 'UNRECONCILED',
    });

    const g2bInvoice = await Invoice.create({
      organizationId,
      importJobId: organizationId,
      sourceDataset: 'GSTR_2B',
      supplierGstin: '27AABCU9603R1ZM',
      supplierName: 'Apex Logistics',
      invoiceNumber: 'INV/001',
      normalizedInvoiceNumber: 'INV1',
      invoiceDate: new Date('2024-08-10'),
      documentType: 'INVOICE',
      taxableValue: 100000,
      cgst: 0,
      sgst: 0,
      igst: 18000,
      cess: 0,
      totalAmount: 118000,
      itcEligibility: 'ELIGIBLE',
      filingPeriod: '2024-Q3',
      reconciliationStatus: 'UNRECONCILED',
    });

    // Unfiled purchase invoice (missing in GSTR-2B)
    await Invoice.create({
      organizationId,
      importJobId: organizationId,
      sourceDataset: 'PURCHASE_REGISTER',
      supplierGstin: '29AAACH7409R1ZX',
      supplierName: 'Infosys Cloud Systems',
      invoiceNumber: 'ICS-999',
      normalizedInvoiceNumber: 'ICS999',
      invoiceDate: new Date('2024-08-14'),
      documentType: 'INVOICE',
      taxableValue: 50000,
      cgst: 4500,
      sgst: 4500,
      igst: 0,
      cess: 0,
      totalAmount: 59000,
      itcEligibility: 'ELIGIBLE',
      filingPeriod: '2024-Q3',
      reconciliationStatus: 'UNRECONCILED',
    });

    const run = await ReconciliationEngine.run({
      organizationId,
      initiatedBy: userId,
      period: '2024-Q3',
    });

    expect(run.status).toBe('COMPLETED');
    expect(run.exactMatchesCount).toBe(1);
    expect(run.missingIn2bCount).toBe(1);
    expect(run.totalTaxAtRisk).toBe(9000); // 4500 CGST + 4500 SGST
  });
});

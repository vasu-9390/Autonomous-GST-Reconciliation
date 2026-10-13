import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/database';
import { Organization } from './models/Organization';
import { User } from './models/User';
import { ImportJob } from './models/ImportJob';
import { Invoice } from './models/Invoice';
import { ReconciliationRun } from './models/ReconciliationRun';
import { MismatchCase } from './models/MismatchCase';
import { ImportParser } from './modules/imports/importParser';
import { ReconciliationEngine } from './modules/reconciliation/reconciliationEngine';
import { CopilotService } from './modules/copilot/copilotService';

export async function seedDatabase() {
  console.log('🌱 Starting database seeding for Autonomous GST Reconciliation & Mismatch Copilot...');
  await connectDatabase();

  // Clear existing demo records
  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    ImportJob.deleteMany({}),
    Invoice.deleteMany({}),
    ReconciliationRun.deleteMany({}),
    MismatchCase.deleteMany({}),
  ]);

  // 1. Create Organization
  const org = await Organization.create({
    name: 'Bharat Enterprise Solutions Pvt Ltd',
    gstin: '27AABCB1234D1ZM',
    pan: 'AABCB1234D',
    state: '27-Maharashtra',
    industry: 'Engineering & Technology Logistics',
    settings: {
      amountTolerance: 1.0,
      taxTolerance: 1.0,
      dateWindowDays: 30,
    },
  });
  console.log(`✅ Organization created: ${org.name} (${org.gstin})`);

  // 2. Create Users for all 4 roles
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const users = await User.insertMany([
    {
      name: 'Aditya Sharma',
      email: 'admin@gstcopilot.io',
      passwordHash,
      role: 'SUPER_ADMIN',
      organizationId: org._id,
    },
    {
      name: 'Pooja Iyer',
      email: 'finance@gstcopilot.io',
      passwordHash,
      role: 'FINANCE_MANAGER',
      organizationId: org._id,
    },
    {
      name: 'Rohan Deshmukh',
      email: 'accountant@gstcopilot.io',
      passwordHash,
      role: 'ACCOUNTANT',
      organizationId: org._id,
    },
    {
      name: 'Sunil Mehta (KPMG)',
      email: 'auditor@gstcopilot.io',
      passwordHash,
      role: 'AUDITOR',
      organizationId: org._id,
    },
  ]);
  console.log(`✅ 4 Role-based demo accounts created:`);
  users.forEach((u) => console.log(`   - ${u.role}: ${u.email} / ${defaultPassword}`));

  const financeManager = users[1];

  // 3. Load & Import Sample Purchase Register
  const prPath = path.resolve(__dirname, '../../sample-data/purchase_register_2024_q3.csv');
  const prBuffer = fs.readFileSync(prPath);
  const prRows = await ImportParser.parseBufferToRows(prBuffer, 'purchase_register_2024_q3.csv');
  const prMapping = ImportParser.autoDetectColumnMapping(Object.keys(prRows[0]));
  const { validInvoices: prValid, errors: prErrors, duplicateCount: prDupes } = ImportParser.processRows(prRows, prMapping);

  const prJob = await ImportJob.create({
    organizationId: org._id,
    userId: financeManager._id,
    datasetType: 'PURCHASE_REGISTER',
    fileName: 'purchase_register_2024_q3.csv',
    fileSizeBytes: prBuffer.length,
    status: 'COMPLETED',
    totalRows: prRows.length,
    importedRows: prValid.length,
    failedRows: prErrors.length,
    duplicateRows: prDupes,
    rowErrors: prErrors,
    columnMapping: prMapping,
  });

  await Invoice.insertMany(
    prValid.map((v) => ({
      ...v,
      organizationId: org._id,
      importJobId: prJob._id,
      sourceDataset: 'PURCHASE_REGISTER',
      filingPeriod: '2024-Q3',
    }))
  );
  console.log(`✅ Imported ${prValid.length} purchase register invoices (${prErrors.length} errors/skipped)`);

  // 4. Load & Import Sample GSTR-2B
  const g2bPath = path.resolve(__dirname, '../../sample-data/gstr_2b_2024_q3.csv');
  const g2bBuffer = fs.readFileSync(g2bPath);
  const g2bRows = await ImportParser.parseBufferToRows(g2bBuffer, 'gstr_2b_2024_q3.csv');
  const g2bMapping = ImportParser.autoDetectColumnMapping(Object.keys(g2bRows[0]));
  const { validInvoices: g2bValid, errors: g2bErrors, duplicateCount: g2bDupes } = ImportParser.processRows(g2bRows, g2bMapping);

  const g2bJob = await ImportJob.create({
    organizationId: org._id,
    userId: financeManager._id,
    datasetType: 'GSTR_2B',
    fileName: 'gstr_2b_2024_q3.csv',
    fileSizeBytes: g2bBuffer.length,
    status: 'COMPLETED',
    totalRows: g2bRows.length,
    importedRows: g2bValid.length,
    failedRows: g2bErrors.length,
    duplicateRows: g2bDupes,
    rowErrors: g2bErrors,
    columnMapping: g2bMapping,
  });

  await Invoice.insertMany(
    g2bValid.map((v) => ({
      ...v,
      organizationId: org._id,
      importJobId: g2bJob._id,
      sourceDataset: 'GSTR_2B',
      filingPeriod: '2024-Q3',
    }))
  );
  console.log(`✅ Imported ${g2bValid.length} GSTR-2B invoices`);

  // 5. Run Initial Reconciliation
  console.log('🔄 Executing deterministic 10-stage reconciliation...');
  const run = await ReconciliationEngine.run({
    organizationId: org._id as mongoose.Types.ObjectId,
    initiatedBy: financeManager._id as mongoose.Types.ObjectId,
    period: '2024-Q3',
    amountTolerance: 1.0,
    taxTolerance: 1.0,
    dateWindowDays: 30,
    fuzzyDistance: 2,
  });

  console.log(`✅ Reconciliation Run Completed:`);
  console.log(`   - Matched Percentage: ${run.reconciledPercentage}%`);
  console.log(`   - Exact Matches: ${run.exactMatchesCount}`);
  console.log(`   - Probable Matches: ${run.probableMatchesCount}`);
  console.log(`   - Missing in 2B: ${run.missingIn2bCount}`);
  console.log(`   - Tax Mismatches: ${run.taxMismatchCount}`);
  console.log(`   - Total Tax At Risk: ₹${run.totalTaxAtRisk.toFixed(2)}`);

  // 6. Pre-generate deterministic AI explanations for mismatch cases
  const cases = await MismatchCase.find({ organizationId: org._id, matchType: { $ne: 'EXACT_MATCH' } });
  for (const c of cases) {
    const aiResp = CopilotService.getDeterministicFallback(c);
    c.aiExplanation = {
      explanation: aiResp.explanation,
      possibleCauses: aiResp.possibleCauses,
      recommendedAction: aiResp.recommendedAction,
      verificationChecklist: aiResp.verificationChecklist,
      confidence: aiResp.confidence,
      generatedAt: new Date(),
    };
    await c.save();
  }
  console.log(`✅ Pre-populated AI Copilot explanations for ${cases.length} mismatch cases.`);
  console.log('🎉 Seeding successfully completed!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => disconnectDatabase())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

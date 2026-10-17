import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Types derived from schema
type PersonnelCategory = 'Consultant' | 'Commuter' | 'PRL' | 'Loan';
type LocationType = 'Rig' | 'Home' | 'Office' | 'Available' | 'SNOC' | 'Other';

interface MappedEngineer {
  id: string; // personId
  name: string;
  sapNumber: string;
  optimaNumber: string;
  optimaExpiry: Date | null;
  h2sExpiry: Date | null;
  tbosietExpiry: Date | null;
  visaExpiry: Date | null;
  customerMedicalExpiry: Date | null;
  passportExpiry: Date | null;
  eidExpiry: Date | null;
  onshoreSecurityPassExpiry: Date | null;
  offshoreSecurityPassExpiry: Date | null;
  wmsExpiry: Date | null;
  uaeHomeContact: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface MappedPersonnel {
  id: string; // personId matched from Engineer
  name: string;
  hitchDays: number;
  dateArrivedAUH: Date | null;
  dateTraveledHome: Date | null;
  daysOff: number;
  category: PersonnelCategory;
  locationType: LocationType;
  rigName: string;
  location: string;
  status: string;
  dateReturn: Date | null;
  comments: string;
  createdAt: string;
  updatedAt: string;
}

interface ScriptOptions {
  engineersPath: string;
  personnelPath: string;
  dryRun: boolean;
  force: boolean;
}

// Parse command line arguments
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  let engineersPath = 'Engineers Data.xlsx';
  let personnelPath = 'Personnel.xlsx';
  let dryRun = false;
  let force = false;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--force') {
      force = true;
    } else if (arg.startsWith('--engineers=')) {
      engineersPath = arg.split('=')[1];
    } else if (arg.startsWith('--personnel=')) {
      personnelPath = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npx tsx scripts/importExcelData.ts [options]

Options:
  --engineers=<path>   Path to Engineers Data.xlsx (default: "Engineers Data.xlsx")
  --personnel=<path>   Path to Personnel.xlsx (default: "Personnel.xlsx")
  --dry-run            Simulate import without writing to Firestore
  --force              Overwrite existing Firestore documents
  --help               Show this help message
`);
      process.exit(0);
    }
  }

  // Fallback checks for file variants if default files don't exist directly
  if (!fs.existsSync(engineersPath)) {
    const variants = ['Engineers_Data.xlsx', 'EngineersData.xlsx', 'Engineers.xlsx', 'engineers.xlsx'];
    for (const v of variants) {
      if (fs.existsSync(v)) {
        engineersPath = v;
        break;
      }
    }
  }

  if (!fs.existsSync(personnelPath)) {
    const variants = ['Personnel_Data.xlsx', 'personnel.xlsx'];
    for (const v of variants) {
      if (fs.existsSync(v)) {
        personnelPath = v;
        break;
      }
    }
  }

  return { engineersPath, personnelPath, dryRun, force };
}

// Helper to safely extract field values from row using multiple potential key aliases
function getField(row: Record<string, any>, possibleKeys: string[]): any {
  const rowKeys = Object.keys(row);
  for (const key of possibleKeys) {
    const target = key.toLowerCase().replace(/[\s_#\/\-]/g, '');
    for (const rKey of rowKeys) {
      const normalizedRowKey = rKey.toLowerCase().replace(/[\s_#\/\-]/g, '');
      if (normalizedRowKey === target) {
        const val = row[rKey];
        if (val !== undefined && val !== null) {
          return val;
        }
      }
    }
  }
  return undefined;
}

// Parse Excel dates into JS Date objects
function parseExcelDate(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return null;
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0));
      }
      const utcDays = val - 25569;
      return new Date(utcDays * 86400 * 1000);
    } catch {
      return null;
    }
  }

  if (typeof val === 'string') {
    const s = val.trim();
    if (!s || s.toLowerCase() === 'n/a' || s === '-' || s === 'null') return null;

    // Try Standard Date constructor
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d;
    }

    // Try DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (ddmmyyyy) {
      const p1 = parseInt(ddmmyyyy[1], 10);
      const p2 = parseInt(ddmmyyyy[2], 10);
      const year = parseInt(ddmmyyyy[3], 10);
      let day = p1;
      let month = p2;
      if (p1 <= 12 && p2 > 12) {
        day = p2;
        month = p1;
      }
      const testDate = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(testDate.getTime())) return testDate;
    }

    // Try DD-MMM-YYYY e.g., 9-Jan-2027
    const ddMmmYyyy = s.match(/^(\d{1,2})[\/\.-]([a-zA-Z]{3,9})[\/\.-](\d{4})$/);
    if (ddMmmYyyy) {
      const day = parseInt(ddMmmYyyy[1], 10);
      const monthStr = ddMmmYyyy[2].toLowerCase();
      const year = parseInt(ddMmmYyyy[3], 10);
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIdx = months.findIndex((m) => monthStr.startsWith(m));
      if (monthIdx !== -1) {
        const testDate = new Date(Date.UTC(year, monthIdx, day));
        if (!isNaN(testDate.getTime())) return testDate;
      }
    }
  }

  return null;
}

// Normalize name string for consistent matching
function normalizeName(str: string): string {
  return (str || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Parse Category
function parseCategory(val: any): PersonnelCategory {
  if (!val) return 'Commuter';
  const s = String(val).trim().toLowerCase();
  if (s.includes('consult')) return 'Consultant';
  if (s.includes('prl')) return 'PRL';
  if (s.includes('loan')) return 'Loan';
  return 'Commuter';
}

// Parse LocationType and RigName from row
function parseLocationAndRigFromRow(row: Record<string, any>): { locationType: LocationType; rigName: string } {
  // 1. Check explicit rig columns first
  const rawRigVal = getField(row, [
    'Rig Name', 'Rig', 'Offshore Rig', 'Platform', 'Rig Code', 'Rig No', 'Current Rig', 'Rig/Platform', 'Rig #'
  ]);

  if (rawRigVal !== undefined && rawRigVal !== null) {
    const s = String(rawRigVal).trim();
    if (s !== '') {
      const lower = s.toLowerCase();
      if (lower === 'home') return { locationType: 'Home', rigName: '' };
      if (lower === 'office' || lower === 'auh office') return { locationType: 'Office', rigName: '' };
      if (lower === 'available') return { locationType: 'Available', rigName: '' };
      if (lower === 'snoc') return { locationType: 'SNOC', rigName: '' };
      if (lower === 'other') return { locationType: 'Other', rigName: '' };
      if (lower !== 'rig' && lower !== 'on rig' && lower !== 'off rig') {
        return { locationType: 'Rig', rigName: s };
      }
    }
  }

  // 2. Check location / status / site / location-type columns
  const candidateKeys = [
    'Location Type', 'Location', 'Loc Type', 'Loc', 'Current Location',
    'Rig / Location', 'Rig/Location', 'Location/Rig', 'Rig Location',
    'Status', 'Current Status', 'Work Location', 'Site', 'Duty Station'
  ];

  let detectedLocationType: LocationType = 'Rig';
  let detectedRigName = '';

  for (const keyCandidate of candidateKeys) {
    const val = getField(row, [keyCandidate]);
    if (val === undefined || val === null) continue;
    const s = String(val).trim();
    if (!s) continue;

    const lower = s.toLowerCase();

    if (lower === 'home') {
      return { locationType: 'Home', rigName: '' };
    } else if (lower === 'office' || lower === 'auh office') {
      return { locationType: 'Office', rigName: '' };
    } else if (lower === 'available') {
      return { locationType: 'Available', rigName: '' };
    } else if (lower === 'snoc') {
      return { locationType: 'SNOC', rigName: '' };
    } else if (lower === 'other') {
      return { locationType: 'Other', rigName: '' };
    } else if (lower === 'rig') {
      detectedLocationType = 'Rig';
    } else if (lower === 'on rig' || lower === 'off rig') {
      continue;
    } else {
      // It's a specific rig code e.g. "AD-116", "AD-181", "ROC", "GW-154"
      detectedLocationType = 'Rig';
      detectedRigName = s;
      break;
    }
  }

  return { locationType: detectedLocationType, rigName: detectedRigName };
}

// Initialize Firebase Admin
function initFirebaseAdmin(): Firestore | null {
  try {
    let app;
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (saPath && fs.existsSync(saPath)) {
        const saContent = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        app = initializeApp({
          credential: cert(saContent),
          projectId: saContent.project_id || 'personnel-tracker-halliburton'
        });
        console.log(`[Firebase Admin] Initialized using service account at: ${saPath}`);
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const saContent = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        app = initializeApp({
          credential: cert(saContent),
          projectId: saContent.project_id || 'personnel-tracker-halliburton'
        });
        console.log(`[Firebase Admin] Initialized using FIREBASE_SERVICE_ACCOUNT_JSON env var`);
      } else {
        app = initializeApp({
          credential: applicationDefault(),
          projectId: 'personnel-tracker-halliburton'
        });
        console.log(`[Firebase Admin] Initialized using applicationDefault() credentials`);
      }
    }

    // Explicitly bind to "default" database ID instead of "(default)"
    const db = getFirestore(app, 'default');
    db.settings({ ignoreUndefinedProperties: true });
    return db;
  } catch (err: any) {
    console.warn(`[Firebase Admin Notice] Could not initialize Firebase Admin SDK: ${err.message}`);
    return null;
  }
}

// Format date for logging output
function formatDateForLog(d: Date | null): string {
  if (!d) return 'null';
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('====================================================');
  console.log('   Excel Data Importer to Firestore (Engineers & Personnel)');
  console.log('====================================================\n');

  const options = parseArgs();
  console.log(`Engineers File: ${options.engineersPath}`);
  console.log(`Personnel File: ${options.personnelPath}`);
  console.log(`Mode:           ${options.dryRun ? 'DRY-RUN (Simulating, no Firestore writes)' : 'LIVE IMPORT'}`);
  console.log(`Overwrite Mode: ${options.force ? 'FORCE (Overwrite existing docs)' : 'SAFE (Skip existing docs)'}\n`);

  // Step 1: Read Engineers Data.xlsx
  if (!fs.existsSync(options.engineersPath)) {
    console.error(`ERROR: Engineers file not found at "${options.engineersPath}".`);
    console.error(`Please make sure "Engineers Data.xlsx" is placed in the workspace or specify --engineers=<path>.`);
    process.exit(1);
  }

  console.log(`Reading "${options.engineersPath}"...`);
  const engWorkbook = XLSX.readFile(options.engineersPath, { cellDates: true, dateNF: 'yyyy-mm-dd' });
  const engSheetName = engWorkbook.SheetNames[0];
  const engRawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(engWorkbook.Sheets[engSheetName]);
  console.log(`Found ${engRawRows.length} total rows in "${options.engineersPath}" (${engSheetName}).\n`);

  const validEngineers: MappedEngineer[] = [];
  const skippedEngineers: { rowNum: number; raw: any; reason: string }[] = [];
  const engineerNameMap = new Map<string, MappedEngineer[]>();

  const nowIso = new Date().toISOString();

  engRawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // Row number in Excel sheet assuming header on row 1
    const personIdRaw = getField(row, ['User ID', 'UserId', 'Person ID', 'PersonId', 'ID']);
    const nameRaw = getField(row, ['Name', 'Full Name', 'Engineer Name', 'Engineer']);

    if (!personIdRaw) {
      skippedEngineers.push({
        rowNum,
        raw: row,
        reason: 'Missing "User ID" / personId field in row'
      });
      return;
    }

    if (!nameRaw) {
      skippedEngineers.push({
        rowNum,
        raw: row,
        reason: 'Missing "Name" field in row'
      });
      return;
    }

    const personId = String(personIdRaw).trim();
    const name = String(nameRaw).trim();

    const mapped: MappedEngineer = {
      id: personId,
      name,
      sapNumber: String(getField(row, ['SAP Number', 'SAP No', 'SAP', 'SAP #']) || '').trim(),
      optimaNumber: String(getField(row, ['Optima Number', 'Optima No', 'Optima', 'Optima ID', 'Optima #']) || '').trim(),
      optimaExpiry: parseExcelDate(getField(row, ['Optima Expiry', 'Optima Exp', 'Optima Expiration'])),
      h2sExpiry: parseExcelDate(getField(row, ['H2S Safety Expiry', 'H2S Expiry', 'H2S Exp', 'H2S Expiration'])),
      tbosietExpiry: parseExcelDate(getField(row, ['TBOSIET Expiry', 'TBOSIET Exp', 'TBOSIET Expiration'])),
      visaExpiry: parseExcelDate(getField(row, ['Visa Expiry', 'Visa Exp', 'Visa Expiration'])),
      customerMedicalExpiry: parseExcelDate(getField(row, ['Customer Medical Expiry', 'Medical Expiry', 'Medical Exp'])),
      passportExpiry: parseExcelDate(getField(row, ['Passport Expiry', 'Passport Exp', 'Passport Expiration'])),
      eidExpiry: parseExcelDate(getField(row, ['Emirates ID Expiry', 'EID Expiry', 'EID Exp', 'Emirates ID (EID) Expiry'])),
      onshoreSecurityPassExpiry: parseExcelDate(getField(row, ['Onshore Security Pass Expiry', 'Onshore Pass Expiry', 'Onshore Security Pass'])),
      offshoreSecurityPassExpiry: parseExcelDate(getField(row, ['Offshore Security Pass Expiry', 'Offshore Pass Expiry', 'Offshore Security Pass'])),
      wmsExpiry: parseExcelDate(getField(row, ['WMS Expiry', 'WMS Exp', 'WMS Expiration'])),
      uaeHomeContact: String(getField(row, ['UAE Home Contact', 'UAE Contact', 'Contact Number', 'Contact', 'Phone']) || '').trim(),
      email: String(getField(row, ['Email', 'Email Address', 'Mail']) || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    validEngineers.push(mapped);

    // Index by normalized name for matching with Personnel.xlsx
    const normName = normalizeName(name);
    if (!engineerNameMap.has(normName)) {
      engineerNameMap.set(normName, []);
    }
    engineerNameMap.get(normName)!.push(mapped);
  });

  // Step 2: Read Personnel.xlsx
  if (!fs.existsSync(options.personnelPath)) {
    console.error(`ERROR: Personnel file not found at "${options.personnelPath}".`);
    console.error(`Please make sure "Personnel.xlsx" is placed in the workspace or specify --personnel=<path>.`);
    process.exit(1);
  }

  console.log(`Reading "${options.personnelPath}"...`);
  const persWorkbook = XLSX.readFile(options.personnelPath, { cellDates: true, dateNF: 'yyyy-mm-dd' });
  const persSheetName = persWorkbook.SheetNames[0];
  const persRawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(persWorkbook.Sheets[persSheetName]);
  console.log(`Found ${persRawRows.length} total rows in "${options.personnelPath}" (${persSheetName}).\n`);

  const validPersonnel: MappedPersonnel[] = [];
  const skippedPersonnel: { rowNum: number; raw: any; reason: string }[] = [];

  persRawRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const nameRaw = getField(row, ['Name', 'Full Name', 'Personnel Name', 'Engineer Name', 'Engineer']);

    if (!nameRaw) {
      skippedPersonnel.push({
        rowNum,
        raw: row,
        reason: 'Missing "Name" field in Personnel row'
      });
      return;
    }

    const name = String(nameRaw).trim();
    const normName = normalizeName(name);
    const matchingEngs = engineerNameMap.get(normName) || [];

    if (matchingEngs.length === 0) {
      skippedPersonnel.push({
        rowNum,
        raw: row,
        reason: `Could not confidently match name "${name}" to any User ID in Engineers Data`
      });
      return;
    }

    if (matchingEngs.length > 1) {
      const matchIds = matchingEngs.map((e) => e.id).join(', ');
      skippedPersonnel.push({
        rowNum,
        raw: row,
        reason: `Ambiguous name match for "${name}" - matches multiple User IDs (${matchIds})`
      });
      return;
    }

    const matchedEngineer = matchingEngs[0];
    const personId = matchedEngineer.id;

    const hitchDaysVal = parseInt(getField(row, ['Hitch Days', 'Hitch', 'HitchDays', 'Rotation Days']), 10);
    const daysOffVal = parseInt(getField(row, ['Days Off', 'Off Days', 'DaysOff']), 10);

    const { locationType, rigName } = parseLocationAndRigFromRow(row);
    const category = parseCategory(getField(row, ['Category', 'Personnel Category', 'Type']));

    const status = locationType === 'Rig' ? 'On Rig' : 'Off Rig';
    const legacyLocation = locationType === 'Rig' ? (rigName || 'Rig') : locationType;

    const mapped: MappedPersonnel = {
      id: personId,
      name,
      hitchDays: isNaN(hitchDaysVal) ? 28 : hitchDaysVal,
      dateArrivedAUH: parseExcelDate(getField(row, ['Date Arrived AUH', 'Arrived AUH', 'AUH Arrival Date', 'AUH Arrival'])),
      dateTraveledHome: parseExcelDate(getField(row, ['Date Traveled Home', 'Traveled Home', 'Home Travel Date', 'Home Travel'])),
      daysOff: isNaN(daysOffVal) ? 28 : daysOffVal,
      category,
      locationType,
      rigName,
      location: legacyLocation,
      status,
      dateReturn: parseExcelDate(getField(row, ['Date Return', 'Return Date', 'Expected Return', 'Return'])),
      comments: String(getField(row, ['Comments', 'Notes', 'Remarks']) || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    validPersonnel.push(mapped);
  });

  // Step 3: Print Audit Summary
  console.log('----------------------------------------------------');
  console.log('   MAPPING & MATCHING AUDIT SUMMARY');
  console.log('----------------------------------------------------');
  console.log(`Engineers Data: ${validEngineers.length} valid mapped, ${skippedEngineers.length} skipped.`);
  console.log(`Personnel Data: ${validPersonnel.length} valid matched, ${skippedPersonnel.length} skipped.\n`);

  if (skippedEngineers.length > 0) {
    console.log('⚠️  SKIPPED ENGINEERS ROWS:');
    skippedEngineers.forEach((s) => {
      console.log(`  - Row #${s.rowNum}: ${s.reason}`);
    });
    console.log('');
  }

  if (skippedPersonnel.length > 0) {
    console.log('⚠️  SKIPPED / UNMATCHED PERSONNEL ROWS:');
    skippedPersonnel.forEach((s) => {
      console.log(`  - Row #${s.rowNum}: ${s.reason}`);
    });
    console.log('');
  }

  // Step 4: Perform Dry-Run or Real Firestore Import
  if (options.dryRun) {
    console.log('====================================================');
    console.log('   DRY-RUN OUTPUT (No Firestore Writes Executed)');
    console.log('====================================================\n');

    console.log('--- ENGINEERS COLLECTION WOULD WRITE: ---');
    validEngineers.forEach((eng) => {
      console.log(`[Doc engineers/${eng.id}] Name: "${eng.name}" | SAP: ${eng.sapNumber || 'N/A'} | Optima: ${eng.optimaNumber || 'N/A'}`);
      console.log(`  Optima Expiry: ${formatDateForLog(eng.optimaExpiry)} | H2S: ${formatDateForLog(eng.h2sExpiry)} | Visa: ${formatDateForLog(eng.visaExpiry)} | Passport: ${formatDateForLog(eng.passportExpiry)}`);
      console.log(`  Email: ${eng.email || 'N/A'} | Contact: ${eng.uaeHomeContact || 'N/A'}`);
    });

    console.log('\n--- PERSONNEL COLLECTION WOULD WRITE: ---');
    validPersonnel.forEach((p) => {
      console.log(`[Doc personnel/${p.id}] Name: "${p.name}" | Category: ${p.category} | LocType: ${p.locationType} (Rig: "${p.rigName}") | Status: ${p.status}`);
      console.log(`  HitchDays: ${p.hitchDays} | DaysOff: ${p.daysOff} | ArrivedAUH: ${formatDateForLog(p.dateArrivedAUH)} | Return: ${formatDateForLog(p.dateReturn)}`);
      if (p.comments) console.log(`  Comments: "${p.comments}"`);
    });

    console.log('\n====================================================');
    console.log(`DRY-RUN Complete! ${validEngineers.length} engineer docs and ${validPersonnel.length} personnel docs ready to write.`);
    console.log('Run without --dry-run to write documents to Firestore.');
    console.log('====================================================');
    return;
  }

  // Real Firestore Write Mode
  console.log('====================================================');
  console.log('   INITIALIZING FIRESTORE WRITE OPERATIONS');
  console.log('====================================================\n');

  const db = initFirebaseAdmin();
  if (!db) {
    console.error(`ERROR: Could not initialize Firestore connection.`);
    console.error(`Please provide service account credentials via FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS environment variables.`);
    console.error(`Example: FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/key.json npx tsx scripts/importExcelData.ts`);
    console.error(`Or test mapping using: npx tsx scripts/importExcelData.ts --dry-run`);
    process.exit(1);
  }

  let engWrites = 0;
  let engSkippedCount = 0;
  let persWrites = 0;
  let persSkippedCount = 0;

  console.log('--- Writing "engineers" collection docs... ---');
  for (const eng of validEngineers) {
    const docRef = db.collection('engineers').doc(eng.id);
    if (!options.force) {
      const snap = await docRef.get();
      if (snap.exists) {
        console.log(`⏭️  Skipped doc engineers/${eng.id} ("${eng.name}"): document already exists (use --force to overwrite)`);
        engSkippedCount++;
        continue;
      }
    }

    await docRef.set(eng, { merge: options.force });
    console.log(`✅ Wrote doc engineers/${eng.id} ("${eng.name}")`);
    engWrites++;
  }

  console.log('\n--- Writing "personnel" collection docs... ---');
  for (const p of validPersonnel) {
    const docRef = db.collection('personnel').doc(p.id);
    if (!options.force) {
      const snap = await docRef.get();
      if (snap.exists) {
        console.log(`⏭️  Skipped doc personnel/${p.id} ("${p.name}"): document already exists (use --force to overwrite)`);
        persSkippedCount++;
        continue;
      }
    }

    await docRef.set(p, { merge: options.force });
    console.log(`✅ Wrote doc personnel/${p.id} ("${p.name}")`);
    persWrites++;
  }

  console.log('\n====================================================');
  console.log('   IMPORT SUMMARY');
  console.log('====================================================');
  console.log(`Engineers: ${engWrites} written, ${engSkippedCount} existing skipped.`);
  console.log(`Personnel: ${persWrites} written, ${persSkippedCount} existing skipped.`);

  console.log('\n--- Querying Firestore Database ("default") for Verification ---');
  try {
    const engSnap = await db.collection('engineers').get();
    const persSnap = await db.collection('personnel').get();
    console.log(`📊 Actual document count in "engineers" collection: ${engSnap.size}`);
    console.log(`📊 Actual document count in "personnel" collection: ${persSnap.size}`);
  } catch (verifyErr: any) {
    console.error(`⚠️  Verification query failed: ${verifyErr?.message || verifyErr}`);
  }

  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

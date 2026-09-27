export const BUDGET_SHEET_ID = "YOUR_GOOGLE_SHEET_ID";
export const BUDGET_SHEET_URL = `https://docs.google.com/spreadsheets/d/${BUDGET_SHEET_ID}/edit?gid=1676910216`;

export function appsScriptForBudget(origin: string) {
  return `// Victor OS: bound script for "your budget workbook".
// Append this below your existing code. The key belongs in Script Properties, not source.
const VICTOR_SYNC_URL = ${JSON.stringify(origin + "/api/sheet-sync/push")};
const VICTOR_SHEET_ID = ${JSON.stringify(BUDGET_SHEET_ID)};

function victorMonth(value) {
  const text = String(value).trim().toLowerCase();
  const months = ['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
  const match = text.match(/^(\\S+)\\s+(\\d{4})$/);
  if (!match) throw new Error('B3 must contain a month and year, e.g. octombrie 2026.');
  const number = months.indexOf(match[1]) + 1;
  if (!number) throw new Error('Unrecognized Romanian month in B3.');
  return match[2] + '-' + String(number).padStart(2, '0');
}

function victorNumber(value, cell) {
  if (value === '' || value === null) return 0;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(cell + ' must contain a non-negative number.');
  return value;
}

function syncVictorBudget() {
  const syncKey = PropertiesService.getScriptProperties().getProperty('VICTOR_SYNC_KEY');
  if (!syncKey) throw new Error('Set VICTOR_SYNC_KEY in Project Settings > Script properties.');
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet.getId() !== VICTOR_SHEET_ID) throw new Error('This script belongs to the linked Victor OS sheet.');
  const sheet = spreadsheet.getSheetByName('Buget lunar');
  if (!sheet) throw new Error('The Buget lunar tab was not found.');
  const rows = sheet.getRange('A5:C9').getValues();
  const categories = rows.map((row, index) => ({
    name: String(row[0]).trim(),
    planned: victorNumber(row[1], 'B' + (index + 5)),
    spent: victorNumber(row[2], 'C' + (index + 5)),
  }));
  if (categories.some(row => !row.name)) throw new Error('A5:A9 must contain category names.');
  const debtCell = sheet.getRange('B15').getValue();
  const payload = {
    sheetId: VICTOR_SHEET_ID,
    month: victorMonth(sheet.getRange('B3').getDisplayValue()),
    salary: victorNumber(sheet.getRange('B2').getValue(), 'B2'),
    categories,
    emergencyTarget: victorNumber(sheet.getRange('B12').getValue(), 'B12'),
    emergencyCurrent: victorNumber(sheet.getRange('B13').getValue(), 'B13'),
    debtRemaining: debtCell === '' ? null : victorNumber(debtCell, 'B15'),
  };
  const response = UrlFetchApp.fetch(VICTOR_SYNC_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Victor-Sync-Key': syncKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200)
    throw new Error('Victor OS sync failed: ' + response.getResponseCode() + ' ' + response.getContentText());
}

function victorBudgetEdited(event) {
  if (event && event.range && event.range.getSheet().getName() === 'Buget lunar') syncVictorBudget();
}

function setupVictorSync() {
  // Run once from the Apps Script editor. Google will ask you to authorize this script.
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet.getId() !== VICTOR_SHEET_ID) throw new Error('Open Apps Script from the linked spreadsheet.');
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (['victorBudgetEdited', 'syncVictorBudget'].includes(trigger.getHandlerFunction()))
      ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger('victorBudgetEdited').forSpreadsheet(spreadsheet).onEdit().create();
  ScriptApp.newTrigger('syncVictorBudget').timeBased().everyMinutes(5).create();
  syncVictorBudget();
}
`;
}

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

function victorRequiredNumber(value, cell, positive) {
  if (typeof value !== 'number' || !Number.isFinite(value) || (positive ? value <= 0 : value < 0))
    throw new Error(cell + ' must contain a ' + (positive ? 'positive' : 'non-negative') + ' number.');
  return value;
}

function victorXtb(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Investiții XTB');
  if (!sheet) throw new Error('The Investiții XTB tab was not found.');
  const rows = sheet.getRange('A8:F107').getValues();
  const dates = sheet.getRange('J8:J107').getDisplayValues();
  const positions = rows.flatMap((row, index) => {
    if (row.every(value => value === '' || value === null)) return [];
    const line = index + 8;
    const instrument = String(row[0]).trim();
    const symbol = String(row[1]).trim();
    const currency = String(row[2]).trim().toUpperCase();
    if (!instrument || !currency) throw new Error('Complete the instrument and currency in XTB row ' + line + '.');
    return [{
      instrument, symbol, currency,
      invested: victorRequiredNumber(row[3], 'XTB D' + line, false),
      current: victorRequiredNumber(row[4], 'XTB E' + line, false),
      fxRon: victorRequiredNumber(row[5], 'XTB F' + line, true),
      updatedAt: dates[index][0] || null,
    }];
  });
  const cash = sheet.getRange('B3').getValue();
  return {
    asOf: sheet.getRange('B2').getDisplayValue() || null,
    cashRon: cash === '' ? null : victorNumber(cash, 'XTB B3'),
    positions,
  };
}

function victorHistory(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Istoric 12 luni');
  if (!sheet) throw new Error('The Istoric 12 luni tab was not found.');
  const values = sheet.getRange('A2:N13').getValues();
  const dates = sheet.getRange('A2:A13').getDisplayValues();
  return values.flatMap((row, index) => {
    if (!dates[index][0]) return [];
    return [{
      month: victorMonth(dates[index][0]),
      income: victorNumber(row[1], 'Istoric B' + (index + 2)),
      spent: victorNumber(row[12], 'Istoric M' + (index + 2)),
      remaining: row[13] === '' ? victorNumber(row[1], 'Istoric B' + (index + 2)) - victorNumber(row[12], 'Istoric M' + (index + 2)) : row[13],
    }];
  });
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
    history: victorHistory(spreadsheet),
    xtb: victorXtb(spreadsheet),
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
  if (event && event.range && ['Buget lunar', 'Investiții XTB'].includes(event.range.getSheet().getName())) syncVictorBudget();
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

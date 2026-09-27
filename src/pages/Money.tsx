import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { AppData } from "../types";
import { money } from "../lib/utils";
import { sheetMoneySummary } from "../lib/sheet-finance";
import { BUDGET_SHEET_URL } from "../lib/sheet-sync";
import { Button, Card, CardHeader, EmptyState } from "../components/ui";

const baseUrl = BUDGET_SHEET_URL.split("?gid=")[0];
const xtbUrl = `${baseUrl}?gid=1372025324`;
const historyUrl = `${baseUrl}?gid=92941595`;
const ron = (value: number) => money(value, "RON");
const xtbRon = (value: number) => new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);
const number = (value: number) =>
  new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(value);

export function MoneyPage({ data }: { data: AppData }) {
  const [tab, setTab] = useState<"Overview" | "Budget" | "XTB" | "History">(
    "Overview",
  );
  const [historyIndex, setHistoryIndex] = useState(-1);
  const sheet = data.sheetBudgets[0];
  const summary = sheetMoneySummary(sheet);
  const history = sheet?.history ?? [];
  const activeHistoryIndex =
    historyIndex < 0
      ? history.length - 1
      : Math.min(historyIndex, history.length - 1);
  const selectedHistory = history[activeHistoryIndex];
  const maxHistory = Math.max(
    1,
    ...history.flatMap((row) => [row.income, row.spent]),
  );

  if (!sheet || !summary)
    return (
      <div className="page-stack">
        <Card>
          <CardHeader
            eyebrow="GOOGLE SHEETS / RON"
            title="Money vine din Google Sheets"
          />
          <EmptyState
            title="Aștept prima sincronizare"
            text="Completează bugetul și investițiile XTB în foaia Google. Victor OS va afișa aici doar valorile sincronizate."
          />
          <a href={BUDGET_SHEET_URL} target="_blank" rel="noopener noreferrer">
            Deschide foaia ↗
          </a>
        </Card>
      </div>
    );

  return (
    <div className="page-stack">
      <div className="money-hero">
        <div className="vos-money-hero-reading">
          <span className="eyebrow">03 / SALARIU · {sheet.month}</span>
          <div className="vos-money-number">
            <strong>{number(summary.remaining)}</strong>
            <span>RON</span>
          </div>
          <p>
            <span>RĂMAS DIN SALARIU</span> <i /> <span>CHELTUIT</span>{" "}
            {ron(summary.spent)}
          </p>
        </div>
        <div className="vos-money-hero-axis">
          <span>CHELTUIELI / SALARIU PLANIFICAT</span>
          <div aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => (
              <i
                key={index}
                className={
                  index < Math.round((summary.spentPercent / 100) * 16)
                    ? "filled"
                    : ""
                }
              />
            ))}
          </div>
          <strong>
            {Math.round(summary.spentPercent)}% <small>UTILIZAT</small>
          </strong>
        </div>
      </div>
      <div className="money-metrics">
        <Card>
          <span>SALARIU PLANIFICAT</span>
          <strong>{ron(sheet.salary)}</strong>
          <small>Din Google Sheets</small>
        </Card>
        <Card>
          <span>CHELTUIT EFECTIV</span>
          <strong>{ron(summary.spent)}</strong>
          <small>Din coloana C</small>
        </Card>
        <Card>
          <span>FOND DE URGENȚĂ</span>
          <strong>{ron(sheet.emergencyCurrent)}</strong>
          <small>Țintă {ron(sheet.emergencyTarget)}</small>
        </Card>
        <Card>
          <span>INVESTIȚII XTB</span>
          <strong>
            {summary.xtbValue === null ? "—" : xtbRon(summary.xtbValue)}
          </strong>
          <small>
            {summary.xtbValue === null
              ? "Completează fila XTB"
              : sheet.xtb?.reported?.totalRon != null
                ? "Total comunicat din XTB"
                : "Valoare manuală în RON"}
          </small>
        </Card>
      </div>
      <div className="section-toolbar money-toolbar">
        <div className="tab-scroll">
          <div className="segmented">
            {(["Overview", "Budget", "XTB", "History"] as const).map((item) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          <RefreshCw size={15} /> Actualizează
        </Button>
      </div>

      {tab === "Overview" && (
        <div className="money-overview-grid">
          <Card>
            <CardHeader
              eyebrow="GOOGLE SHEETS / RON"
              title="Situația lunii"
              subtitle={`Actualizat ${new Date(sheet.syncedAt).toLocaleString("ro-RO")}`}
              action={
                <a
                  href={BUDGET_SHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Deschide foaia ↗
                </a>
              }
            />
            <div className="snapshot-list">
              <div>
                <span>Salariu planificat</span>
                <strong>{ron(sheet.salary)}</strong>
              </div>
              <div>
                <span>Buget alocat</span>
                <strong>{ron(summary.planned)}</strong>
              </div>
              <div>
                <span>Cheltuit efectiv</span>
                <strong>{ron(summary.spent)}</strong>
              </div>
              <div>
                <span>Rămas din salariu</span>
                <strong>{ron(summary.remaining)}</strong>
              </div>
              <div>
                <span>Fond de urgență</span>
                <strong>{ron(sheet.emergencyCurrent)}</strong>
              </div>
              <div>
                <span>Sold datorii</span>
                <strong>
                  {sheet.debtRemaining === null
                    ? "Necompletat"
                    : ron(sheet.debtRemaining)}
                </strong>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader
              eyebrow="XTB"
              title="Portofoliu urmărit"
              subtitle="Valori introduse manual în Google Sheets"
              action={
                <a href={xtbUrl} target="_blank" rel="noopener noreferrer">
                  Deschide XTB ↗
                </a>
              }
            />
            <div className="snapshot-list">
              <div>
                <span>Total XTB comunicat</span>
                <strong>
                  {summary.xtbValue === null
                    ? "Necompletat"
                    : xtbRon(summary.xtbValue)}
                </strong>
              </div>
              <div>
                <span>Numerar XTB</span>
                <strong>
                  {sheet.xtb?.cashRon == null
                    ? "Necompletat"
                    : xtbRon(sheet.xtb.cashRon)}
                </strong>
              </div>
              <div>
                <span>Sumă poziții afișate</span>
                <strong>{summary.positionValue === null ? "Necompletat" : xtbRon(summary.positionValue)}</strong>
              </div>
              <div>
                <span>Retragere în așteptare</span>
                <strong>{sheet.xtb?.reported?.pendingWithdrawalRon == null ? "Necompletat" : xtbRon(sheet.xtb.reported.pendingWithdrawalRon)}</strong>
              </div>
              <div>
                <span>Poziții</span>
                <strong>{sheet.xtb?.positions.length ?? 0}</strong>
              </div>
              <div>
                <span>Data comunicării</span>
                <strong>{sheet.xtb?.asOf || "Necompletată"}</strong>
              </div>
            </div>
            <p className="helper-line">
              Valorile XTB sunt declarate manual. Nu reprezintă cotații live sau
              un sold confirmat de broker.
            </p>
          </Card>
        </div>
      )}

      {tab === "Budget" && (
        <Card className="sheet-budget-card">
          <CardHeader
            eyebrow={`${sheet.month} / RON`}
            title="Buget lunar"
            subtitle="Editează bugetul și cheltuielile în Google Sheets"
            action={
              <a
                href={BUDGET_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Deschide foaia ↗
              </a>
            }
          />
          <div className="sheet-budget-metrics">
            <div>
              <span>Salariu</span>
              <strong>{ron(sheet.salary)}</strong>
            </div>
            <div>
              <span>Buget alocat</span>
              <strong>{ron(summary.planned)}</strong>
            </div>
            <div>
              <span>Cheltuit</span>
              <strong>{ron(summary.spent)}</strong>
            </div>
            <div>
              <span>Rămas</span>
              <strong>{ron(summary.remaining)}</strong>
            </div>
          </div>
          <div className="sheet-budget-rows">
            {sheet.categories.map((row) => (
              <div key={row.name}>
                <strong>{row.name}</strong>
                <span>{ron(row.planned)} buget</span>
                <span>{ron(row.spent)} cheltuit</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "XTB" && (
        <Card>
          <CardHeader
            eyebrow="INVESTIȚII / XTB"
            title="Poziții urmărite"
            subtitle={
              sheet.xtb?.asOf
                ? `Date comunicate la ${sheet.xtb.asOf}`
                : "Actualizare manuală în Google Sheets"
            }
            action={
              <a href={xtbUrl} target="_blank" rel="noopener noreferrer">
                Editează în Sheet <ArrowUpRight size={15} />
              </a>
            }
          />
          <div className="sheet-budget-metrics">
            <div>
              <span>Total afișat de XTB</span>
              <strong>
                {summary.xtbValue === null ? "—" : xtbRon(summary.xtbValue)}
              </strong>
            </div>
            <div>
              <span>Buget inițial</span>
              <strong>
                {sheet.xtb?.reported?.budgetRon == null ? "—" : xtbRon(sheet.xtb.reported.budgetRon)}
              </strong>
            </div>
            <div>
              <span>Fond afișat</span>
              <strong>
                {sheet.xtb?.reported?.fundRon == null ? "—" : xtbRon(sheet.xtb.reported.fundRon)}
              </strong>
            </div>
            <div>
              <span>Sumă poziții afișate</span>
              <strong>
                {summary.positionValue === null ? "—" : xtbRon(summary.positionValue)}
              </strong>
            </div>
          </div>
          <div className="snapshot-list">
            <div><span>Retragere în așteptare</span><strong>{sheet.xtb?.reported?.pendingWithdrawalRon == null ? "—" : xtbRon(sheet.xtb.reported.pendingWithdrawalRon)}</strong></div>
            <div><span>Cumpărare în așteptare</span><strong>{sheet.xtb?.reported?.pendingBuyRon == null ? "—" : xtbRon(sheet.xtb.reported.pendingBuyRon)}</strong></div>
            <div><span>Vânzare în așteptare</span><strong>{sheet.xtb?.reported?.pendingSellRon == null ? "—" : xtbRon(sheet.xtb.reported.pendingSellRon)}</strong></div>
            <div><span>Diferență fond față de suma pozițiilor</span><strong>{summary.fundGap === null ? "—" : xtbRon(summary.fundGap)}</strong></div>
            <div><span>Diferență total față de fond + retragere</span><strong>{summary.accountGap === null ? "—" : xtbRon(summary.accountGap)}</strong></div>
            <div><span>Numerar disponibil confirmat</span><strong>{sheet.xtb?.cashRon == null ? "Necompletat" : xtbRon(sheet.xtb.cashRon)}</strong></div>
            <div><span>Capital investit în poziții</span><strong>{summary.invested === null ? "Necompletat" : xtbRon(summary.invested)}</strong></div>
            <div><span>Rezultat nerealizat</span><strong>{summary.unrealized === null ? "Necompletat" : xtbRon(summary.unrealized)}</strong></div>
          </div>
          <p className="helper-line">Ordinele și retragerea sunt în așteptare și nu sunt adăugate încă o dată la total. Diferențele sunt afișate pentru reconciliere; nu reprezintă profit sau numerar disponibil.</p>
          {sheet.xtb?.positions.length ? (
            <div className="data-list">
              {sheet.xtb.positions.map((position, index) => {
                const current = position.current !== null && position.fxRon !== null
                  ? position.current * position.fxRon : null;
                const gain = position.current !== null && position.invested !== null && position.fxRon !== null
                  ? (position.current - position.invested) * position.fxRon : null;
                return (
                  <div className="data-row" key={`${position.symbol}-${index}`}>
                    <div className="data-primary">
                      <strong>{position.instrument}</strong>
                      <small>
                        {position.symbol || "Fără simbol"} · {position.currency || "Monedă de completat"}{" "}
                        {position.fxRon !== null ? `· curs ${position.fxRon.toLocaleString("ro-RO")}` : "· curs de completat"}
                        {position.updatedAt ? ` · ${position.updatedAt}` : ""}
                      </small>
                    </div>
                    <div className="data-amount">
                      <strong>{current === null ? "Valoare de completat" : xtbRon(current)}</strong>
                      <small>
                        {gain === null ? "Costul poziției nu este completat" : `${gain >= 0 ? "+" : ""}${xtbRon(gain)} rezultat nerealizat`}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Nicio poziție XTB completată"
              text="Adaugă instrumentul, valorile investită și curentă, moneda și cursul RON în fila Investiții XTB."
            />
          )}
          <p className="helper-line">
            Victor OS afișează numai ce introduci în Sheet. Nu citește contul
            XTB și nu plasează ordine.
          </p>
        </Card>
      )}

      {tab === "History" && (
        <Card className="chart-card">
          <CardHeader
            eyebrow="ISTORIC 12 LUNI"
            title="Venit și cheltuieli"
            subtitle="Luni salvate în Google Sheets"
            action={
              <a href={historyUrl} target="_blank" rel="noopener noreferrer">
                Deschide istoricul ↗
              </a>
            }
          />
          {history.length ? (
            <>
              <div className="chart-legend">
                <span>
                  <i className="legend-income" /> Venit
                </span>
                <span>
                  <i className="legend-expense" /> Cheltuit
                </span>
              </div>
              <div className="chart-readout" aria-live="polite">
                <span>{selectedHistory?.month}</span>
                <strong>
                  {ron(selectedHistory?.income ?? 0)} <small>venit</small>
                </strong>
                <strong>
                  {ron(selectedHistory?.spent ?? 0)} <small>cheltuit</small>
                </strong>
              </div>
              <div
                className="bar-chart"
                aria-label="Venit și cheltuieli din lunile salvate"
              >
                {history.map((row, index) => (
                  <button
                    key={row.month}
                    type="button"
                    className={`bar-group ${activeHistoryIndex === index ? "active" : ""}`}
                    onClick={() => setHistoryIndex(index)}
                    onMouseEnter={() => setHistoryIndex(index)}
                    onFocus={() => setHistoryIndex(index)}
                    aria-label={`${row.month}: venit ${ron(row.income)}, cheltuit ${ron(row.spent)}`}
                  >
                    <div className="bars">
                      <div
                        className="bar bar-income"
                        style={{
                          height: `${Math.max(2, (row.income / maxHistory) * 100)}%`,
                        }}
                      />
                      <div
                        className="bar bar-expense"
                        style={{
                          height: `${Math.max(2, (row.spent / maxHistory) * 100)}%`,
                        }}
                      />
                    </div>
                    <span>{row.month}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="Nu există luni salvate"
              text="La finalul lunii, folosește bifa de salvare din Google Sheets pentru a adăuga istoricul."
            />
          )}
        </Card>
      )}
    </div>
  );
}

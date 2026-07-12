// Données de démonstration : 18 mois de DCA mensuel sur un PEA fictif.
//   npm run seed                      → transactions seules (les cours seront
//                                       récupérés sur Yahoo au premier chargement)
//   npm run seed -- --with-fake-prices → ajoute un historique de cours synthétique
//                                       (utile hors-ligne / pour la démo)

import { db } from "../src/db";
import {
  accounts,
  instruments,
  prices,
  priceSync,
  transactions,
} from "../src/db/schema";

const WITH_FAKE_PRICES = process.argv.includes("--with-fake-prices");
const MONTHS = 18;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Le 3 du mois, il y a `monthsAgo` mois (ajusté au jour ouvré suivant). */
function dcaDate(monthsAgo: number): string {
  const d = new Date();
  d.setUTCDate(3);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}

// Prix d'achat plausibles : tendance haussière + oscillation déterministe.
const priceAt = {
  WPEA: (m: number) => 5.0 * Math.pow(1.007, m) * (1 + 0.02 * Math.sin(m * 1.7)),
  ESE: (m: number) => 30.0 * Math.pow(1.006, m) * (1 + 0.025 * Math.sin(m * 1.3 + 1)),
  TTE: (m: number) => 54.0 * Math.pow(1.003, m) * (1 + 0.03 * Math.sin(m * 0.9 + 2)),
};

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function main() {
  // Base repartant de zéro à chaque seed.
  db.delete(prices).run();
  db.delete(priceSync).run();
  db.delete(transactions).run();
  db.delete(instruments).run();
  db.delete(accounts).run();

  const account = db
    .insert(accounts)
    .values({ name: "PEA", type: "PEA", createdAt: new Date().toISOString() })
    .returning()
    .get();

  const [wpea, ese, tte] = db
    .insert(instruments)
    .values([
      {
        symbol: "WPEA.PA",
        isin: "IE0002XZSHO1",
        name: "iShares MSCI World Swap PEA",
        type: "ETF",
      },
      {
        symbol: "ESE.PA",
        isin: "FR0011550185",
        name: "BNP Paribas Easy S&P 500",
        type: "ETF",
      },
      {
        symbol: "TTE.PA",
        isin: "FR0000120271",
        name: "TotalEnergies",
        type: "ACTION",
      },
    ])
    .returning()
    .all();

  let tteShares = 0;
  for (let m = MONTHS - 1; m >= 0; m--) {
    const date = dcaDate(m);
    const monthIndex = MONTHS - 1 - m; // 0 = il y a 18 mois

    db.insert(transactions)
      .values({
        accountId: account.id,
        type: "DEPOSIT",
        date,
        amount: 500,
        fees: 0,
        note: "Versement DCA mensuel",
      })
      .run();

    const pWpea = r2(priceAt.WPEA(monthIndex));
    const qWpea = Math.floor(((280 - 1) / pWpea) * 10000) / 10000;
    db.insert(transactions)
      .values({
        accountId: account.id,
        instrumentId: wpea.id,
        type: "BUY",
        date,
        quantity: qWpea,
        unitPrice: pWpea,
        fees: 1,
      })
      .run();

    const pEse = r2(priceAt.ESE(monthIndex));
    const qEse = Math.floor((120 - 1) / pEse);
    if (qEse > 0) {
      db.insert(transactions)
        .values({
          accountId: account.id,
          instrumentId: ese.id,
          type: "BUY",
          date,
          quantity: qEse,
          unitPrice: pEse,
          fees: 1,
        })
        .run();
    }

    const pTte = r2(priceAt.TTE(monthIndex));
    const qTte = Math.floor((100 - 1) / pTte);
    if (qTte > 0) {
      tteShares += qTte;
      db.insert(transactions)
        .values({
          accountId: account.id,
          instrumentId: tte.id,
          type: "BUY",
          date,
          quantity: qTte,
          unitPrice: pTte,
          fees: 1,
        })
        .run();
    }

    // Dividende TotalEnergies trimestriel (~0,79 €/action).
    if (monthIndex > 0 && monthIndex % 3 === 0) {
      db.insert(transactions)
        .values({
          accountId: account.id,
          instrumentId: tte.id,
          type: "DIVIDEND",
          date,
          amount: r2(tteShares * 0.79),
          fees: 0,
          note: "Dividende trimestriel",
        })
        .run();
    }
  }

  if (WITH_FAKE_PRICES) {
    seedFakePrices([
      { id: wpea.id, price: priceAt.WPEA },
      { id: ese.id, price: priceAt.ESE },
      { id: tte.id, price: priceAt.TTE },
    ]);
  }

  const txCount = db.select().from(transactions).all().length;
  console.log(
    `Seed OK : 1 compte, 3 instruments, ${txCount} transactions` +
      (WITH_FAKE_PRICES ? ", cours synthétiques inclus." : "."),
  );
}

/** Cours quotidiens synthétiques (jours ouvrés) interpolés sur les ancres mensuelles. */
function seedFakePrices(list: Array<{ id: number; price: (m: number) => number }>) {
  const start = new Date(dcaDate(MONTHS - 1) + "T00:00:00Z");
  const end = new Date();
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000);

  for (const { id, price } of list) {
    const rows: Array<{ instrumentId: number; date: string; close: number }> = [];
    for (let day = 0; day <= totalDays; day++) {
      const d = new Date(start.getTime() + day * 86_400_000);
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      const monthFloat = (day / totalDays) * (MONTHS - 1);
      const base = price(monthFloat);
      const wobble = 1 + 0.008 * Math.sin(day * 0.7) + 0.005 * Math.sin(day * 2.3);
      rows.push({ instrumentId: id, date: iso(d), close: r2(base * wobble) });
    }
    for (let i = 0; i < rows.length; i += 300) {
      db.insert(prices).values(rows.slice(i, i + 300)).run();
    }
    db.insert(priceSync)
      .values({ instrumentId: id, lastFetchedAt: new Date().toISOString(), lastError: null })
      .run();
  }
}

main();

/*
  The Survivor Gauntlet – das Regelwerk, ohne Oberfläche.

  Ein Lauf geht über alle Survivor: Mit jedem einmal entkommen, gezogen wird
  zufällig aus denen, die noch offen sind. Die Reihe ist in fünf Checkpoints
  geteilt, und mit jedem fällt ein Perk-Platz weg – am Ende steht man ohne
  Perks da.

  Ein Tod kostet die ganze angefangene Stufe: Es geht zurück auf deren ersten
  Platz, die dort geschafften Survivor wandern wieder in den Topf.

  Der Verlauf (`log`) ist die Wahrheit, der Fortschritt wird daraus errechnet
  (siehe `replay`). Das hält den Rücksetzer atomar und macht ein Verklicken
  rückgängig: Der letzte Eintrag fällt weg, der Rest rechnet sich neu.
*/
import { SURVIVORS } from './data.js?v=70';
import { PERKS } from './perks.js?v=70';
import { pickRandom } from './utils.js?v=70';

/** Der Sammelposten "Anderer Survivor" ist kein Charakter und spielt nicht mit. */
const PLACEHOLDER = 'other_survivor';

export const ROSTER = SURVIVORS.filter((s) => s.id !== PLACEHOLDER);
export const ROSTER_IDS = ROSTER.map((s) => s.id);

/*
  Unter fünf Survivorn bliebe für die fünf Stufen nichts mehr übrig – dann
  wäre der erste Platz schon der perklose. So kurz darf ein Lauf nicht sein.
*/
export const MIN_POOL = 5;

/**
 * Die fünf Checkpoints. `perks` ist die Obergrenze an Perk-Plätzen,
 * `teachable`, wie viele davon dem gespielten Charakter gehören müssen.
 */
export const TIERS = [
  {
    name: 'The Warm Up',
    perks: 4,
    teachable: 1,
    requirement: 'Mindestens 1 Perk des Charakters',
  },
  {
    name: 'The Thinning',
    perks: 3,
    teachable: 1,
    requirement: 'Mindestens 1 Perk des Charakters',
  },
  {
    name: 'The Struggle',
    perks: 2,
    teachable: 1,
    requirement: 'Mindestens 1 Perk des Charakters',
  },
  {
    name: 'The Hardcore',
    perks: 1,
    teachable: 1,
    requirement: 'Der eine Perk muss dem Charakter gehören',
  },
  {
    name: 'The Legend',
    perks: 0,
    teachable: 0,
    requirement: 'Keine Perks erlaubt',
  },
];

/** Die drei möglichen Ausgänge eines Versuchs. */
export const RESULTS = {
  escaped: { label: 'Entkommen', tone: 'good' },
  died: { label: 'Gestorben', tone: 'bad' },
  void: { label: 'Zählt nicht', tone: 'neutral' },
};

// ------------------------------------------------------------------ Stufen --

/**
 * Wie viele Survivor auf jede Stufe entfallen. Die Regeln teilen 52 Survivor
 * in 10/10/10/10/12 – also je zehn, und was übrig bleibt, hängt an der letzten
 * Stufe. Genauso wird hier für beliebig viele Survivor gerechnet.
 */
export function tierSizes(total) {
  const last = TIERS.length - 1;
  const base = Math.max(0, Math.floor(total / TIERS.length));
  const sizes = TIERS.map(() => base);
  sizes[last] = Math.max(0, total - base * last);
  return sizes;
}

/** Die Stufen mit ihren Grenzen: `from`/`to` sind Plätze, ab 1 gezählt. */
export function tierPlan(total) {
  const sizes = tierSizes(total);
  let from = 1;

  return TIERS.map((tier, index) => {
    const size = sizes[index];
    const entry = { ...tier, index, size, from, to: from + size - 1 };
    from += size;
    return entry;
  });
}

/** Zu welcher Stufe ein Platz gehört. Jenseits des letzten bleibt es die letzte. */
export function tierAt(plan, position) {
  return plan.find((tier) => tier.size > 0 && position >= tier.from && position <= tier.to)
    ?? [...plan].reverse().find((tier) => tier.size > 0)
    ?? plan[plan.length - 1];
}

// --------------------------------------------------------------- Fortschritt --

/**
 * Den Verlauf nachspielen: Was steht nach allen Versuchen zu Buche?
 *
 *   escaped -> ein Platz weiter
 *   died    -> zurück auf den ersten Platz der angefangenen Stufe
 *   void    -> nichts passiert (DC vor dem ersten Generator, Abbruch beim Laden)
 */
export function replay(log, total) {
  const plan = tierPlan(total);
  const done = [];
  let deaths = 0;
  let voided = 0;

  for (const entry of log ?? []) {
    if (entry?.result === 'escaped') {
      done.push({ survivor: entry.survivor, wild: Boolean(entry.wild) });
    } else if (entry?.result === 'died') {
      deaths += 1;
      done.length = Math.max(0, tierAt(plan, done.length + 1).from - 1);
    } else {
      voided += 1;
    }
  }

  return { plan, done, deaths, voided };
}

/** Survivor, die als erledigt gelten – Wildcards zählen nicht dazu. */
export const completedIds = (done) => done.filter((d) => !d.wild).map((d) => d.survivor);

/** Wie lang der Lauf ist: mit Wildcards immer über alle Survivor. */
export function runLength(pool, wildcards) {
  const size = pool.length;
  return wildcards ? Math.max(size, ROSTER_IDS.length) : size;
}

/**
 * Der nächste Survivor. Gezogen wird aus dem Pool, der noch offen ist; ist der
 * leer und der Lauf läuft mit Wildcards noch weiter, kommt ein bereits
 * geschaffter Charakter ein zweites Mal dran.
 */
export function drawNext({ pool, done, wildcards, total }) {
  if (done.length >= total) return null;

  const finished = completedIds(done);
  const open = pool.filter((id) => !finished.includes(id));
  if (open.length) return { survivor: pickRandom(open), wild: false };

  return wildcards && pool.length ? { survivor: pickRandom(pool), wild: true } : null;
}

/** Perks, die dem Charakter gehören – sie erfüllen die Perk-Vorgabe. */
export function teachablePerks(survivorId) {
  return PERKS
    .filter((p) => p.owner === survivorId)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/**
 * Wohin ein Tod auf diesem Platz zurückwirft – für die Warnung, bevor man
 * auf "Gestorben" drückt.
 */
export function lossOnDeath(plan, position) {
  const tier = tierAt(plan, position);
  return { tier, back: tier.from, lost: Math.max(0, position - tier.from) };
}

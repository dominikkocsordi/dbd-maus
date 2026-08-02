/*
  Prestige-Wappen. Form und Farbe hängen allein am Level:

    · alle 5 Stufen wechselt die Farbe   (Stein → Bronze → Silber → Gold → Blut)
    · alle 25 Stufen wechselt die Form   (Siegel → Raute → Sechseck → Achteck)
    · Prestige 100 bekommt sein eigenes, leuchtendes Wappen

  Dieselbe Rechnung liefert damit für jedes Level von 1 bis 100 genau ein
  Wappen – ohne Tabelle mit hundert Einträgen.
*/
import { escapeHtml } from './utils.js?v=42';

export const MAX_PRESTIGE = 100;

/** Farbstufen in ihrer Reihenfolge; jede gilt für fünf Level. */
export const TIERS = [
  { key: 'stone', label: 'Stein' },
  { key: 'bronze', label: 'Bronze' },
  { key: 'silver', label: 'Silber' },
  { key: 'gold', label: 'Gold' },
  { key: 'crimson', label: 'Blut' },
];

/** Formstufen. `from`/`to` sind einschließlich gemeint. */
export const MILESTONES = [
  { key: 'seal', shape: 'circle', from: 1, to: 25, label: 'Meilenstein 1' },
  { key: 'shard', shape: 'diamond', from: 26, to: 50, label: 'Meilenstein 2' },
  { key: 'core', shape: 'hex', from: 51, to: 75, label: 'Meilenstein 3' },
  { key: 'bulwark', shape: 'octa', from: 76, to: 99, label: 'Meilenstein 4' },
  { key: 'apex', shape: 'apex', from: 100, to: 100, label: 'Vollendet' },
];

const clamp = (level) => Math.min(MAX_PRESTIGE, Math.max(0, Math.round(Number(level) || 0)));

/** Farbstufe eines Levels, null bei 0. */
export function crestTier(level) {
  const n = clamp(level);
  return n < 1 ? null : TIERS[Math.floor((n - 1) / 5) % TIERS.length];
}

/** Formstufe eines Levels, null bei 0. */
export function crestMilestone(level) {
  const n = clamp(level);
  return MILESTONES.find((m) => n >= m.from && n <= m.to) ?? null;
}

/** Kurzbeschreibung fürs Auge: die Farbstufe, bei 100 "Vollendet". */
export function crestLabel(level) {
  const n = clamp(level);
  if (!n) return 'Noch kein Prestige';
  if (n === MAX_PRESTIGE) return 'Vollendet';
  return crestTier(n).label;
}

/**
 * Fertiges Wappen. `modifier` nimmt Größenklassen auf (crest--sm, crest--lg).
 * Level 0 bleibt als leerer Rahmen stehen, damit die Kachel nicht springt.
 */
export function crestHtml(level, modifier = '') {
  const n = clamp(level);
  const extra = modifier ? ` ${modifier}` : '';
  const title = n ? `Prestige ${n} – ${crestLabel(n)}` : 'Noch kein Prestige';

  /*
    Aufbau von außen nach innen: gezackter Kranz, dunkler Rahmen, Metallring,
    farbige Platte, Zahl – dazu der kleine Dorn unten am Rahmen.
  */
  const layers = '<span class="crest__thorns"></span>'
    + '<span class="crest__frame"></span>'
    + '<span class="crest__ring"></span>'
    + '<span class="crest__plate"></span>';

  if (!n) {
    return `<span class="crest crest--empty${extra}" title="${escapeHtml(title)}" aria-hidden="true">
      ${layers}<span class="crest__num">–</span>
    </span>`;
  }

  const tier = crestTier(n);
  const milestone = crestMilestone(n);

  return `<span class="crest crest--${tier.key} crest--${milestone.shape}${extra}"
                title="${escapeHtml(title)}" aria-hidden="true">
    ${layers}
    <span class="crest__num">${n}</span>
    <span class="crest__spike"></span>
  </span>`;
}

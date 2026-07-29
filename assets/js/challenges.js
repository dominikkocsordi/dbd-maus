// Challenge-Katalog. Neue Challenges einfach unten ergänzen.
//
//   generator: 'random_build'  -> die Challenge bekommt den Zufallsgenerator
//   Ohne `generator` ist es eine reine Beschreibung.

export const CHALLENGES = [
  {
    id: 'random_build',
    title: 'Alles dem Zufall',
    tagline: 'Charakter und Build werden ausgewürfelt.',
    rules: [
      'Rolle festlegen oder ebenfalls auswürfeln lassen.',
      'Charakter und vier Perks kommen aus dem Generator.',
      'Nichts tauschen – so spielen, wie es fällt.',
      'Ergebnis als Build speichern und beim Match eintragen.',
    ],
    generator: 'random_build',
  },
];

export const challengeById = (id) => CHALLENGES.find((c) => c.id === id) ?? null;

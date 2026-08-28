// Stammdaten für die Dropdowns.
// Neue Killer/Survivor einfach unten ergänzen – gespeichert wird die `id`,
// angezeigt das `label`. Die IDs bleiben stabil, damit alte Einträge lesbar bleiben.
// `file` ist der Original-Dateiname des Portraits im Storage-Bucket "characters".

export const GAME_MODES = [
  { id: 'public', label: 'Normal' },
  { id: '2v8', label: '2v8' },
  { id: 'chaos_shuffle', label: 'Chaos Shuffle' },
  { id: 'event', label: 'Event-Modus' },
  { id: 'custom', label: 'Privates Spiel (Custom)' },
  { id: 'lights_out', label: 'Lights Out' },
];

export const KILLERS = [
  { id: 'trapper', label: 'Trapper', file: 'K01_TheTrapper_Portrait.png' },
  { id: 'wraith', label: 'Wraith', file: 'K02_TheWraith_Portrait.png' },
  { id: 'hillbilly', label: 'Hillbilly', file: 'K03_TheHillbilly_Portrait.png' },
  { id: 'nurse', label: 'Nurse', file: 'K04_TheNurse_Portrait.png' },
  { id: 'hag', label: 'Hag', file: 'K05_TheHag_Portrait.png' },
  { id: 'shape', label: 'Michael', file: 'K06_TheShape_Portrait.png' },
  { id: 'doctor', label: 'Doc', file: 'K07_TheDoctor_Portrait.png' },
  { id: 'huntress', label: 'Huntress', file: 'K08_TheHuntress_Portrait.png' },
  { id: 'cannibal', label: 'Booba', file: 'K09_TheCannibal_Portrait.png' },
  { id: 'nightmare', label: 'Freddy', file: 'K10_TheNightmare_Portrait.png' },
  { id: 'pig', label: 'Pig', file: 'K11_ThePig_Portrait.png' },
  { id: 'clown', label: 'Clown', file: 'K12_TheClown_Portrait.png' },
  { id: 'spirit', label: 'Spirit', file: 'K13_TheSpirit_Portrait.png' },
  { id: 'legion', label: 'Legion', file: 'K14_TheLegion_Portrait.png' },
  { id: 'plague', label: 'Plague', file: 'K15_ThePlague_Portrait.png' },
  { id: 'ghost_face', label: 'Ghostface', file: 'K16_TheGhostface_Portrait.png' },
  { id: 'demogorgon', label: 'Demogorgon', file: 'K17_TheDemogorgon_Portrait.png' },
  { id: 'oni', label: 'Oni', file: 'K18_TheOni_Portrait.png' },
  { id: 'deathslinger', label: 'Deathslinger', file: 'K19_TheDeathslinger_Portrait.png' },
  { id: 'executioner', label: 'Pyramidhead', file: 'K20_TheExecutioner_Portrait.png' },
  { id: 'blight', label: 'Blight', file: 'K21_TheBlight_Portrait.png' },
  { id: 'twins', label: 'Twins', file: 'K22_TheTwins_Portrait.png' },
  { id: 'trickster', label: 'Trickster', file: 'K23_TheTrickster_Portrait.png' },
  { id: 'nemesis', label: 'Nemesis', file: 'K24_TheNemesis_Portrait.png' },
  { id: 'cenobite', label: 'Pinhead', file: 'K25_TheCenobite_Portrait.png' },
  { id: 'artist', label: 'Artist', file: 'K26_TheArtist_Portrait.png' },
  { id: 'onryo', label: 'Onryo', file: 'K27_TheOnryo_Portrait.png' },
  { id: 'dredge', label: 'Dredge', file: 'K28_TheDredge_Portrait.png' },
  { id: 'mastermind', label: 'Wesker', file: 'K29_TheMasterMind_Portrait.png' },
  { id: 'knight', label: 'Knight', file: 'K30_TheKnight_Portrait.png' },
  { id: 'skull_merchant', label: 'Skully', file: 'K31_TheSkullMerchant_Portrait.png' },
  { id: 'singularity', label: 'Singularity', file: 'K32_TheSingularity_Portrait.png' },
  { id: 'xenomorph', label: 'Xenomorph', file: 'K33_TheXenomorph_Portrait.png' },
  { id: 'good_guy', label: 'Chucky', file: 'K34_TheYerkes_Portrait.png' },
  { id: 'unknown', label: 'Unknown', file: 'K35_TheUnknown_Portrait.png' },
  { id: 'lich', label: 'Lich', file: 'K36_TheLich_Portrait.png' },
  { id: 'dark_lord', label: 'Dracula', file: 'K37_TheDracula_Portrait.png' },
  { id: 'houndmaster', label: 'Houndmaster', file: 'K38_TheHoundmaster_Portrait.png' },
  { id: 'ghoul', label: 'Ghoul', file: 'K39_TheGhoul_Portrait.png' },
  { id: 'animatronic', label: 'Springtrap', file: 'K40_TheAnimatronic_Portrait.png' },
  { id: 'krasue', label: 'Krasue', file: 'T_UI_K41_TheKrasue_Portrait.png' },
  { id: 'first', label: 'First', file: 'T_UI_K42_TheFirst_Portrait.png' },
  { id: 'jason', label: 'Jason', file: 'T_UI_K43_TheSlasher_Portrait.png' },
  { id: 'judgment', label: 'Judgment', file: 'T_UI_K44_TheJudgment_Portrait.png' },
  { id: 'other_killer', label: 'Anderer Killer', file: 'empty.png' },
];

export const SURVIVORS = [
  { id: 'dwight_fairfield', label: 'Dwight', file: 'S01_DwightFairfield_Portrait.png' },
  { id: 'meg_thomas', label: 'Meg', file: 'S02_MegThomas_Portrait.png' },
  { id: 'claudette_morel', label: 'Claudette', file: 'S03_ClaudetteMorel_Portrait.png' },
  { id: 'jake_park', label: 'Jake', file: 'S04_JakePark_Portrait.png' },
  { id: 'nea_karlsson', label: 'Nea', file: 'S05_NeaKarlsson_Portrait.png' },
  { id: 'laurie_strode', label: 'Laurie', file: 'S06_LaurieStrode_Portrait.png' },
  { id: 'ace_visconti', label: 'Ace', file: 'S07_AceVisconti_Portrait.png' },
  { id: 'bill_overbeck', label: 'Bill', file: 'S08_WilliamBillOverbeck_Portrait.png' },
  { id: 'feng_min', label: 'Feng', file: 'S09_FengMin_Portrait.png' },
  { id: 'david_king', label: 'David (King)', file: 'S10_DavidKing_Portrait.png' },
  { id: 'quentin_smith', label: 'Quentin', file: 'S11_QuentinSmith_Portrait.png' },
  { id: 'david_tapp', label: 'David (Tapp)', file: 'S12_DetectiveDavidTapp_Portrait.png' },
  { id: 'kate_denson', label: 'Kate', file: 'S13_KateDenson_Portrait.png' },
  { id: 'adam_francis', label: 'Adam', file: 'S14_AdamFrancis_Portrait.png' },
  { id: 'jeff_johansen', label: 'Jeff', file: 'S15_JeffJohansen_Portrait.png' },
  { id: 'jane_romero', label: 'Jane', file: 'S16_JaneRomero_Portrait.png' },
  { id: 'ash_williams', label: 'Ash', file: 'S17_AshleyJWilliams_Portrait.png' },
  { id: 'steve_harrington', label: 'Steve', file: 'S18_SteveHarrington_Portrait.png' },
  { id: 'nancy_wheeler', label: 'Nancy', file: 'S19_NancyWheeler_Portrait.png' },
  { id: 'yui_kimura', label: 'Yui', file: 'S20_YuiKimura_Portrait.png' },
  { id: 'zarina_kassir', label: 'Zarina', file: 'S21_ZarinaKassir_Portrait.png' },
  { id: 'cheryl_mason', label: 'Cheryl', file: 'S22_CherylMason_Portrait.png' },
  { id: 'felix_richter', label: 'Felix', file: 'S23_FelixRichter_Portrait.png' },
  { id: 'elodie_rakoto', label: 'Élodie', file: 'S24_ElodieRakoto_Portrait.png' },
  { id: 'yun_jin_lee', label: 'Yun-Jin', file: 'S25_YunJinLee_Portrait.png' },
  { id: 'jill_valentine', label: 'Jill', file: 'S26_JillValentine_Portrait.png' },
  { id: 'leon_kennedy', label: 'Leon', file: 'S27_LeonSKennedy_Portrait.png' },
  { id: 'mikaela_reid', label: 'Mikaela', file: 'S28_MikaelaReid_Portrait.png' },
  { id: 'jonah_vasquez', label: 'Jonah', file: 'S29_JonahVasquez_Portrait.png' },
  { id: 'yoichi_asakawa', label: 'Yoichi', file: 'S30_YoichiAsakawa_Portrait.png' },
  { id: 'haddie_kaur', label: 'Haddie', file: 'S31_HaddieKaur_Portrait.png' },
  { id: 'ada_wong', label: 'Ada', file: 'S32_AdaWong_Portrait.png' },
  { id: 'rebecca_chambers', label: 'Rebecca', file: 'S33_RebeccaChambers_Portrait.png' },
  { id: 'vittorio_toscano', label: 'Vittorio', file: 'S34_VittorioToscano_Portrait.png' },
  { id: 'thalita_lyra', label: 'Thalita', file: 'S35_ThalitaLyra_Portrait.png' },
  { id: 'renato_lyra', label: 'Renato', file: 'S36_RenatoLyra_Portrait.png' },
  { id: 'gabriel_soma', label: 'Gabriel', file: 'S37_GabrielSoma_Portrait.png' },
  { id: 'nicolas_cage', label: 'Nicolas', file: 'S38_NicolasCage_Portrait.png' },
  { id: 'ellen_ripley', label: 'Ellen', file: 'S39_EllenRipley_Portrait.png' },
  { id: 'alan_wake', label: 'Alan', file: 'S40_AlanWake_Portrait.png' },
  { id: 'sable_ward', label: 'Sable', file: 'S41_SableWard_Portrait.png' },
  { id: 'troupe', label: 'Aestri', file: 'S42_TheTroupe_Portrait.png' },
  { id: 'lara_croft', label: 'Lara', file: 'S43_LaraCroft_Portrait.png' },
  { id: 'trevor_belmont', label: 'Trevor', file: 'S44_TrevorBelmont_Portrait.png' },
  { id: 'taurie_cain', label: 'Taurie', file: 'S45_TaurieCain_Portrait.png' },
  { id: 'rick_grimes', label: 'Rick', file: 'S47_RickGrimes_Portrait.png' },
  { id: 'michonne', label: 'Michonne', file: 'S48_MichonneGrimes_Portrait.png' },
  { id: 'vee', label: 'Vee', file: 'T_UI_S49_VeeBoonyasak_Portrait.png' },
  { id: 'dustin', label: 'Dustin', file: 'T_UI_S50_DustinHenderson_Portrait.png' },
  { id: 'eleven', label: 'Eleven', file: 'T_UI_S51_Eleven_Portrait.png' },
  { id: 'kwon', label: 'Kwon', file: 'T_UI_S52_KwonTaeYoung_Portrait.png' },
  { id: 'shane', label: 'Shane', file: 'T_UI_S53_ShaneWiigwaas_Portrait.png' },
  { id: 'aurora', label: 'Aurora', file: 'T_UI_S54_AuroraStardotter_Portrait.png' },
  { id: 'orela_rose', label: 'Orela', file: 'S46_OrelaRose_Portrait.png' },
  { id: 'other_survivor', label: 'Anderer Survivor', file: 'empty.png' },
];

/*
  In diesen Modi gibt das Spiel die Perks vor (Chaos Shuffle würfelt sie, 2v8
  kennt stattdessen Klassen) – ein eigener Build lässt sich dort nicht spielen.
*/
export const MODES_WITHOUT_BUILDS = ['2v8', 'chaos_shuffle'];
export const supportsBuilds = (mode) => !MODES_WITHOUT_BUILDS.includes(mode);

/** In 2v8 stehen acht Survivor auf dem Feld, sonst vier. */
export const maxKills = (mode) => (mode === '2v8' ? 8 : 4);

/**
 * Und zwei Killer: als Survivor spielt man dort gegen ein Duo, beide gehören
 * gleichberechtigt ans Match.
 */
export const hasKillerDuo = (mode) => mode === '2v8';

/**
 * 2v8 gibt jeder Seite eine Klasse (Enforcer, Medic, Escapist …). Sie tritt an
 * die Stelle der Perks und wird wie ein Ausrüstungsteil geführt – mit Spiel-ID,
 * Namen und Symbol.
 */
export const hasClasses = (mode) => mode === '2v8';

/*
  2v8 spielt mit Klassen statt Perks, Lights Out nimmt sie einem ganz weg –
  dort gibt es nichts einzutragen. Chaos Shuffle würfelt die Perks zwar zu,
  festhalten lassen sie sich trotzdem.
*/
export const MODES_WITHOUT_PERKS = ['2v8', 'lights_out'];
export const hasPerks = (mode) => !MODES_WITHOUT_PERKS.includes(mode);

/*
  Lights Out lässt nur das Item bzw. die Kraft zu, 2v8 ebenso: Add-ons und
  Opfergabe bleiben dort in der Truhe. Felder dafür wären also irreführend, und
  der Import darf auch nichts eintragen.
*/
export const MODES_WITHOUT_EXTRAS = ['2v8', 'lights_out'];
export const hasLoadoutExtras = (mode) => !MODES_WITHOUT_EXTRAS.includes(mode);

/**
 * Ab wie vielen Kills ein Match als Erfolg zählt (drei Viertel des Feldes) –
 * in 2v8 sind das 6 statt 3, sonst wäre die Serie dort geschenkt.
 */
export const streakMinKills = (mode) => Math.ceil(maxKills(mode) * 0.75);

const toMap = (list) => Object.fromEntries(list.map((e) => [e.id, e.label]));
const toFileMap = (list) => Object.fromEntries(list.map((e) => [e.id, e.file]).filter(([, f]) => f));

export const GAME_MODE_LABELS = toMap(GAME_MODES);
export const KILLER_LABELS = toMap(KILLERS);
export const SURVIVOR_LABELS = toMap(SURVIVORS);

const KILLER_FILES = toFileMap(KILLERS);
const SURVIVOR_FILES = toFileMap(SURVIVORS);

/*
  Notnagel für IDs, die der Katalog (noch) nicht kennt: Am Match steht dann der
  gespeicherte Rohwert, und "judgment" mitten in einer Liste aus Trapper und
  Nurse sieht nach Fehler aus. Wenigstens als Name lesbar machen – aus
  "other_killer" wird "Other Killer".
*/
export const humanizeId = (id) => String(id ?? '')
  .split('_')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

export function labelFor(role, id) {
  if (!id) return '–';
  return (role === 'killer' ? KILLER_LABELS : SURVIVOR_LABELS)[id] ?? humanizeId(id);
}

/**
 * "vs Wraith" – und in 2v8, wo zwei Killer gegenüberstehen, "vs Wraith & Oni".
 * Ohne Gegner im Match bleibt es null, dann steht dort schlicht nichts.
 */
export function facedKillersLabel(match) {
  const ids = [match?.faced_killer, match?.faced_killer_2].filter(Boolean);
  return ids.length ? `vs ${ids.map((id) => labelFor('killer', id)).join(' & ')}` : null;
}

/** Dateiname des Portraits im Storage-Bucket, oder null wenn keins hinterlegt ist. */
export function fileFor(role, id) {
  if (!id) return null;
  return (role === 'killer' ? KILLER_FILES : SURVIVOR_FILES)[id] ?? null;
}

export function gameModeLabel(id) {
  return GAME_MODE_LABELS[id] ?? id;
}

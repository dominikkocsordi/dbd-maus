// Katalog für Items/Kräfte, Add-ons und Opfergaben.
//
// Gespeichert wird die `id` des Spiels (z. B. Item_Camper_Flashlight) – das ist
// derselbe Schlüssel, den auch der offizielle Tracker liefert. Die Icons heißen
// im Bucket entsprechend `<id>.png`, wie bei Behaviour selbst.
//
// Der Katalog ist aus echten Matches zusammengetragen und deckt darum noch
// nicht alles ab, was es im Spiel gibt. Fehlt ein Eintrag, geht trotzdem nichts
// verloren: Import und Anzeige arbeiten mit der ID weiter und leiten daraus
// einen lesbaren Namen ab. Ergänzt wird hier einfach Zeile für Zeile.
//
//   role  : 'killer' | 'survivor'
//   group : verbindet Add-ons mit dem Item bzw. der Kraft, zu der sie gehören

export const ITEMS = [
  { id: 'Item_Slasher_LFChainsaw', name: 'Bubba\'s Chainsaw', role: 'killer', group: 'lfchainsaw' },
  { id: 'Item_Slasher_Killer07Item', name: 'Carter\'s Spark', role: 'killer', group: 'spark' },
  { id: 'Item_Slasher_Chainsaw', name: 'Chainsaw', role: 'killer', group: 'chainsaw' },
  { id: 'Item_Slasher_K31Power', name: 'Eyes In The Sky', role: 'killer', group: 'k31' },
  { id: 'Item_Slasher_Frenzy', name: 'Feral Frenzy', role: 'killer', group: 'frenzy' },
  { id: 'Item_Slasher_K33Power', name: 'Hidden Pursuit', role: 'killer', group: 'k33' },
  { id: 'Item_Slasher_QatarKillerPower', name: 'Of the Abyss', role: 'killer', group: 'qatarkiller' },
  { id: 'Item_K43Power', name: 'Omnipresent Evil', role: 'killer', group: 'k43' },
  { id: 'Item_Slasher_ThrowingKnives', name: 'Showstopper', role: 'killer', group: 'trickster' },
  { id: 'Item_Slasher_Blinker', name: 'Spencer\'s Last Breath', role: 'killer', group: 'blinker' },
  { id: 'Item_Slasher_K25Power', name: 'Summons of Pain', role: 'killer', group: 'k25' },
  { id: 'Item_Slasher_K24Power', name: 'T-VIRUS', role: 'killer', group: 'k24' },
  { id: 'Item_Slasher_HarpoonRifle', name: 'The Redeemer', role: 'killer', group: 'harpoon' },
  { id: 'Item_Slasher_K37Power', name: 'Vampiric Shift', role: 'killer', group: 'k37' },
  { id: 'Item_Slasher_K36Power', name: 'VILE DARKNESS', role: 'killer', group: 'k36' },
  { id: 'Item_Slasher_K29Power', name: 'Virulent Bound', role: 'killer', group: 'k29' },
  { id: 'Item_Slasher_CloakBell', name: 'Wailing Bell', role: 'killer', group: 'bell' },
  { id: 'Item_Slasher_Kanobo', name: 'Yamaoka\'s Wrath', role: 'killer', group: 'kanobo' },
  { id: 'Item_Slasher_PhaseWalker', name: 'Yamaoka’s Haunting', role: 'killer', group: 'phasewalker' },
  { id: 'Item_Camper_AlexsToolbox', name: 'Alex\'s Toolbox', role: 'survivor', group: 'alexstoolbox' },
  { id: 'Item_Camper_Medkit05', name: 'All Hallows\' Eve Lunchbox', role: 'survivor', group: 'medkit' },
  { id: 'Item_Camper_RainbowMap', name: 'Annotated Map', role: 'survivor', group: 'map' },
  { id: 'Item_Camper_Flashlight_Anniversary2026', name: 'Banquet Flashlight', role: 'survivor', group: 'flashlight' },
  { id: 'Item_Camper_Medkit_Anniversary2026', name: 'Banquet Med-Kit', role: 'survivor', group: 'medkit' },
  { id: 'Item_Camper_Toolbox_Anniversary2026', name: 'Banquet Toolbox', role: 'survivor', group: 'toolbox' },
  { id: 'Item_Camper_MedKit', name: 'Camping Aid Kit', role: 'survivor', group: 'medkit' },
  { id: 'Item_Camper_CommodiousToolbox', name: 'Commodious Toolbox', role: 'survivor', group: 'commodioustoolbox' },
  { id: 'Item_Camper_MedKit03', name: 'Emergency Med-kit', role: 'survivor', group: 'medkit' },
  { id: 'Item_Camper_EngineerToolbox', name: 'Engineer\'s Toolbox', role: 'survivor', group: 'engineertoolbox' },
  { id: 'Item_Camper_MedKit02', name: 'First Aid Kit', role: 'survivor', group: 'medkit' },
  { id: 'Item_Camper_Flashlight', name: 'Flashlight', role: 'survivor', group: 'flashlight' },
  { id: 'Item_Camper_Flashlight_Anniversary2022', name: 'Masquerade Flashlight', role: 'survivor', group: 'flashlight' },
  { id: 'Item_Camper_Toolbox_Anniversary2022', name: 'Masquerade Toolbox', role: 'survivor', group: 'toolbox' },
  { id: 'Item_Camper_MedKit04', name: 'Ranger Med-kit', role: 'survivor', group: 'medkit' },
  { id: 'Item_Camper_Flashlight02', name: 'Sport Flashlight', role: 'survivor', group: 'flashlight' },
  { id: 'Item_Camper_Flashlight03', name: 'Utility Flashlight', role: 'survivor', group: 'flashlight' },
  { id: 'Item_Survivor_VigosFogVial', name: 'Vigo\'s Fog Vial', role: 'survivor', group: 'fogvial' },
];

export const OFFERINGS = [
  { id: 'ArdentRavenWreath', name: 'Ardent Raven Wreath', role: 'killer' },
  { id: 'BloodyPartyStreamers', name: 'Bloody Party Streamers', role: 'killer' },
  { id: 'EbonyMementoMori', name: 'Ebony Memento Mori', role: 'killer' },
  { id: 'HeartLocket', name: 'Heart Locket', role: 'killer' },
  { id: 'IvoryMementoMori', name: 'Ivory Memento Mori', role: 'killer' },
  { id: 'PutridOak', name: 'Putrid Oak', role: 'killer' },
  { id: 'Anniversary2024Offering', name: 'SCREECH COBBLER', role: 'killer' },
  { id: 'TanagerWreath', name: 'Tanager Wreath', role: 'killer' },
  { id: 'AnnotatedBlueprint', name: 'Annotated Blueprint', role: 'survivor' },
  { id: 'BoundEnvelope', name: 'Bound Envelope', role: 'survivor' },
  { id: 'ClearReagent', name: 'Clear Reagent', role: 'survivor' },
  { id: 'Anniversary2025Offering', name: 'Coconut Scream Pie', role: 'survivor' },
  { id: 'CrispleafAmaranthSachet', name: 'Crispleaf Amaranth Sachet', role: 'survivor' },
  { id: 'EscapeCake', name: 'Escape! Cake', role: 'survivor' },
  { id: 'FragrantSweetWilliam', name: 'Fragrant Sweet William', role: 'survivor' },
  { id: 'PetrifiedOak', name: 'Petrified Oak', role: 'survivor' },
  { id: 'SealedEnvelope', name: 'Sealed Envelope', role: 'survivor' },
  { id: 'ShroudofBinding', name: 'Shroud of Separation', role: 'survivor' },
  { id: 'ShroudofUnion', name: 'Shroud of Union', role: 'survivor' },
  { id: 'Anniversary2026Offering', name: 'Toothy Torte', role: 'survivor' },
];

export const ADDONS = [
  { id: 'Addon_Bell_004', name: '"Blind Warrior" - Mud', role: 'killer', group: 'bell' },
  { id: 'Addon_Spark_CalmMuYisNotes', name: '"Calm" - Carter\'s Notes', role: 'killer', group: 'spark' },
  { id: 'Addon_Spark_DisciplineMuYisNotes', name: '"Discipline" - Carter\'s Notes', role: 'killer', group: 'spark' },
  { id: 'Addon_Bell_007', name: '"The Beast" - Soot', role: 'killer', group: 'bell' },
  { id: 'Addon_K33_20', name: 'Acidic Blood', role: 'killer', group: 'k33' },
  { id: 'ADDON_LFChainsaw_AwardWinningChili', name: 'Award-Winning Chili', role: 'killer', group: 'lfchainsaw' },
  { id: 'Addon_K43_02', name: 'Bent Wheel', role: 'killer', group: 'k43' },
  { id: 'Addon_K43_15', name: 'Bloody Magazine', role: 'killer', group: 'k43' },
  { id: 'Addon_K43_16', name: 'Burnt Fuse', role: 'killer', group: 'k43' },
  { id: 'Addon_K43_09', name: 'Coroner\'s Coffee', role: 'killer', group: 'k43' },
  { id: 'Addon_Chainsaw_002', name: 'Counterweight', role: 'killer', group: 'chainsaw' },
  { id: 'Addon_Chainsaw_001', name: 'Dad\'s Boots', role: 'killer', group: 'chainsaw' },
  { id: 'Addon_K24Power_18', name: 'Depleted Ink Ribbon', role: 'killer', group: 'k24' },
  { id: 'Addon_K33_05', name: 'Drinking Bird', role: 'killer', group: 'k33' },
  { id: 'Addon_K29_14', name: 'Egg (Gold)', role: 'killer', group: 'k29' },
  { id: 'Addon_Demogorgon_ElevensSoda', name: 'Eleven\'s Soda', role: 'killer', group: 'demogorgon' },
  { id: 'ADDON_Frenzy_FilthyBlade', name: 'Filthy Blade', role: 'killer', group: 'frenzy' },
  { id: 'Addon_K25Power_08', name: 'Flickering Television', role: 'killer', group: 'k25' },
  { id: 'ADDON_Frenzy_FumingMixTape', name: 'Fuming Mix Tape', role: 'killer', group: 'frenzy' },
  { id: 'Addon_K43_01', name: 'Garden Claw', role: 'killer', group: 'k43' },
  { id: 'ADDON_Frenzy_IridescentButton', name: 'Iridescent Button', role: 'killer', group: 'frenzy' },
  { id: 'Addon_Harpoon_IridescentCoin', name: 'Iridescent Coin', role: 'killer', group: 'harpoon' },
  { id: 'ADDON_Chainsaw_DoomEngravings', name: 'Iridescent Engravings', role: 'killer', group: 'chainsaw' },
  { id: 'Addon_K25Power_20', name: 'Iridescent Lament Configuration', role: 'killer', group: 'k25' },
  { id: 'Addon_Trickster_03', name: 'Killing Part Chords', role: 'killer', group: 'trickster' },
  { id: 'Addon_PhaseWalker_FathersGlasses', name: 'Kintsugi Teacup', role: 'killer', group: 'phasewalker' },
  { id: 'Addon_K36_05', name: 'Lantern of Revealing', role: 'killer', group: 'k36' },
  { id: 'Addon_K29_06', name: 'Leather Gloves', role: 'killer', group: 'k29' },
  { id: 'Addon_K37_05', name: 'Magical Ticket', role: 'killer', group: 'k37' },
  { id: 'Addon_K24Power_15', name: 'NE-α Parasite', role: 'killer', group: 'k24' },
  { id: 'Addon_PhaseWalker_OrigamiCrane', name: 'Origami Crane', role: 'killer', group: 'phasewalker' },
  { id: 'Addon_K43_08', name: 'Party Noisemaker', role: 'killer', group: 'k43' },
  { id: 'Addon_Blinker_001', name: 'Plaid Flannel', role: 'killer', group: 'blinker' },
  { id: 'Addon_K37_14', name: 'Pocket Watch', role: 'killer', group: 'k37' },
  { id: 'Addon_K29_04', name: 'R.P.D. Shoulder Walkie', role: 'killer', group: 'k29' },
  { id: 'Addon_Kanobo_RenjirosBloodyGlove', name: 'Renjiro’s Bloody Glove', role: 'killer', group: 'kanobo' },
  { id: 'Addon_K36_09', name: 'Ring of Spell Storing', role: 'killer', group: 'k36' },
  { id: 'Addon_Harpoon_SpitPolishRag', name: 'Spit Polish Rag', role: 'killer', group: 'harpoon' },
  { id: 'Addon_Kanobo_SplinteredHull', name: 'Splintered Hull', role: 'killer', group: 'kanobo' },
  { id: 'Addon_Chainsaw_005', name: 'Steel Toe Boots', role: 'killer', group: 'chainsaw' },
  { id: 'Addon_Demogorgon_StickyLining', name: 'Sticky Lining', role: 'killer', group: 'demogorgon' },
  { id: 'ADDON_Frenzy_NastyBlade', name: 'Stylish Sunglasses', role: 'killer', group: 'frenzy' },
  { id: 'ADDON_LFChainsaw_BeastsMarks', name: 'The Beast\'s Marks', role: 'killer', group: 'lfchainsaw' },
  { id: 'Addon_Blinker_005', name: 'Torn Bookmark', role: 'killer', group: 'blinker' },
  { id: 'Addon_K37_08', name: 'Traveler’s Hat', role: 'killer', group: 'k37' },
  { id: 'Addon_Trickster_02', name: 'Trick Pouch', role: 'killer', group: 'trickster' },
  { id: 'Addon_K29_03', name: 'Unicorn Medallion', role: 'killer', group: 'k29' },
  { id: 'Addon_PhaseWalker_WhiteHairRibbon', name: 'White Hair Ribbon', role: 'killer', group: 'phasewalker' },
  { id: 'Addon_K37_10', name: 'White Wolf Medallion', role: 'killer', group: 'k37' },
  { id: 'Addon_K37_09', name: 'Winged Boots', role: 'killer', group: 'k37' },
  { id: 'Addon_PhaseWalker_Zori', name: 'Zōri', role: 'killer', group: 'phasewalker' },
  { id: 'ADDON_medkit_abdominaldressing', name: 'Abdominal Dressing', role: 'survivor', group: 'medkit' },
  { id: 'Addon_Medkit_008', name: 'Anti-Exhaustion Syringe', role: 'survivor', group: 'medkit' },
  { id: 'Addon_Medkit_001', name: 'Bandages', role: 'survivor', group: 'medkit' },
  { id: 'Addon_Map_008', name: 'Battered Tape', role: 'survivor', group: 'map' },
  { id: 'Addon_Flashlight_001', name: 'Battery', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_Toolbox_007', name: 'Brand New Part', role: 'survivor', group: 'toolbox' },
  { id: 'Addon_Medkit_004', name: 'Butterfly Tape', role: 'survivor', group: 'medkit' },
  { id: 'Addon_Toolbox_003', name: 'Clean Rag', role: 'survivor', group: 'toolbox' },
  { id: 'Addon_Map_004', name: 'Crimson Stamp', role: 'survivor', group: 'map' },
  { id: 'ADDON_toolbox_cuttingwire', name: 'Cutting Wire', role: 'survivor', group: 'toolbox' },
  { id: 'Addon_Flashlight_003', name: 'Focus Lens', role: 'survivor', group: 'flashlight' },
  { id: 'ADDON_medkit_gauzeroll', name: 'Gauze Roll', role: 'survivor', group: 'medkit' },
  { id: 'Addon_Medkit_002', name: 'Gel Dressings', role: 'survivor', group: 'medkit' },
  { id: 'Addon_Toolbox_005', name: 'Hacksaw', role: 'survivor', group: 'toolbox' },
  { id: 'Addon_Flashlight_002', name: 'Heavy Duty Battery', role: 'survivor', group: 'flashlight' },
  { id: 'ADDON_flashlight_highendsapphire', name: 'High-end Sapphire lens', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_Toolbox_008', name: 'Instructions', role: 'survivor', group: 'toolbox' },
  { id: 'ADDON_flashlight_intensehalogen', name: 'Intense Halogen', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_Flashlight_008', name: 'Leather Grip', role: 'survivor', group: 'flashlight' },
  { id: 'ADDON_flashlight_lonflifebattery', name: 'Long Life Battery', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_Flashlight_007', name: 'Low Amp Filament', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_Medkit_003', name: 'Medical Scissors', role: 'survivor', group: 'medkit' },
  { id: 'Addon_FogVial_Amplifier', name: 'Mushroom Formula', role: 'survivor', group: 'fogvial' },
  { id: 'ADDON_flashlight_oddbulb', name: 'Odd Bulb', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_FogVial_DenseFogExtract', name: 'Potent Extract', role: 'survivor', group: 'fogvial' },
  { id: 'Addon_Flashlight_005', name: 'Power Bulb', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_Medkit_006', name: 'Rubber Gloves', role: 'survivor', group: 'medkit' },
  { id: 'ADDON_flashlight_rubbergrip', name: 'Rubber Grip', role: 'survivor', group: 'flashlight' },
  { id: 'ADDON_medkit_selfadherentwrap', name: 'Self Adherent Wrap', role: 'survivor', group: 'medkit' },
  { id: 'Addon_Map_007', name: 'Sharpened Flint', role: 'survivor', group: 'map' },
  { id: 'ADDON_toolbox_socketswivels', name: 'Socket Swivels', role: 'survivor', group: 'toolbox' },
  { id: 'Addon_Medkit_005', name: 'Sponge', role: 'survivor', group: 'medkit' },
  { id: 'ADDON_toolbox_springclamp', name: 'Spring Clamp', role: 'survivor', group: 'toolbox' },
  { id: 'Addon_Medkit_007', name: 'Styptic Agent', role: 'survivor', group: 'medkit' },
  { id: 'ADDON_medkit_surgicalsuture', name: 'Surgical Suture', role: 'survivor', group: 'medkit' },
  { id: 'Addon_Flashlight_006', name: 'TIR Optic', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_FogVial_Accelerant', name: 'Volcanic Stone', role: 'survivor', group: 'fogvial' },
  { id: 'Addon_Flashlight_004', name: 'Wide Lens', role: 'survivor', group: 'flashlight' },
  { id: 'Addon_Toolbox_002', name: 'Wire Spool', role: 'survivor', group: 'toolbox' },
];
/*
  Fehlt eine ID im Katalog, wird der Name aus ihr abgeleitet: Präfixe des Spiels
  fallen weg, aus CamelCase werden Wörter. Aus "Item_Camper_AlexsToolbox" wird
  so "Alexs Toolbox" – nicht perfekt, aber lesbar.
*/
function nameFromId(id) {
  const bare = String(id ?? '')
    .replace(/^(?:ADDON|Addon)_/, '')
    .replace(/^Item_(?:Camper|Slasher|Survivor)_/, '')
    .replace(/^Item_/, '');

  return bare
    .replace(/_/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim() || String(id ?? '');
}

const index = (list) => new Map(list.map((entry) => [entry.id, entry]));

const INDEXES = {
  item: index(ITEMS),
  offering: index(OFFERINGS),
  addon: index(ADDONS),
};

/** Katalogeintrag zu einer ID, oder null. `kind` ist item | offering | addon. */
export const loadoutEntry = (kind, id) => (id ? INDEXES[kind]?.get(id) ?? null : null);

/** Anzeigename – aus dem Katalog, sonst aus der ID abgeleitet. */
export function loadoutName(kind, id) {
  if (!id) return '–';
  return loadoutEntry(kind, id)?.name ?? nameFromId(id);
}

/** Einträge einer Rolle, alphabetisch – für die Auswahlfelder. */
export function loadoutList(kind, role) {
  const list = kind === 'item' ? ITEMS : kind === 'offering' ? OFFERINGS : ADDONS;
  return list
    .filter((entry) => entry.role === role)
    .map((entry) => ({ id: entry.id, label: entry.name, group: entry.group }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

/**
 * Add-ons für ein Item: die passenden zuerst, danach der Rest. Bewusst kein
 * Filter – die Zuordnung stimmt nicht überall, und ein fehlendes Add-on wäre
 * ärgerlicher als eine längere Liste.
 */
export function addonsForItem(role, itemId) {
  const group = loadoutEntry('item', itemId)?.group ?? null;
  const list = loadoutList('addon', role);
  if (!group) return list;

  return [
    ...list.filter((entry) => entry.group === group),
    ...list.filter((entry) => entry.group !== group),
  ];
}

/** Bis zu zwei Add-ons pro Match, doppelte und leere fliegen raus. */
export const MAX_ADDONS = 2;
export const cleanAddons = (list) =>
  [...new Set((list ?? []).filter(Boolean))].slice(0, MAX_ADDONS);

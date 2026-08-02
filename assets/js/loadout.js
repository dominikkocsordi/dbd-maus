// Katalog für Items/Kräfte, Add-ons und Opfergaben.
//
// Gespeichert wird die `id` des Spiels (z. B. Item_Camper_Flashlight) – das ist
// derselbe Schlüssel, den auch der offizielle Tracker liefert. Das Bild dazu
// steht als `file` daneben, unter seinem Original-Dateinamen aus dem Spiel
// (iconItems_flashlight.png), genau wie bei Portraits und Perks.
//
// Die Buckets trennen nach Art: items, powers, addons, offerings. Killer-Powers
// und Survivor-Items stehen hier zwar in derselben Liste, ihre Bilder liegen
// aber getrennt – die Rolle entscheidet.
//
// Der Katalog ist aus echten Matches zusammengetragen und deckt darum noch
// nicht alles ab, was es im Spiel gibt. Fehlt ein Eintrag, geht trotzdem nichts
// verloren: Import und Anzeige arbeiten mit der ID weiter und leiten daraus
// einen lesbaren Namen ab. Ergänzt wird hier einfach Zeile für Zeile.
//
//   role  : 'killer' | 'survivor'
//   file  : Dateiname im Bucket; fehlt er, bleibt das Namenskürzel stehen
//   group : verbindet Add-ons mit dem Item bzw. der Power, zu der sie gehören
//   killer: nur bei Powers – zu welchem Killer sie gehört (aus echten Matches
//           abgeleitet, darum noch nicht für jeden Killer hinterlegt)

export const ITEMS = [
  { id: 'Item_Slasher_LFChainsaw', name: 'Bubba\'s Chainsaw', role: 'killer', group: 'lfchainsaw', killer: 'cannibal', file: 'iconPowers_bubbasChainsaw.png' },
  { id: 'Item_Slasher_Killer07Item', name: 'Carter\'s Spark', role: 'killer', group: 'spark', killer: 'doctor', file: 'iconPowers_cartersSpark.png' },
  { id: 'Item_Slasher_Chainsaw', name: 'Chainsaw', role: 'killer', group: 'chainsaw', killer: 'hillbilly', file: 'iconPowers_chainsaw.png' },
  { id: 'Item_Slasher_K31Power', name: 'Eyes In The Sky', role: 'killer', group: 'k31', killer: 'skull_merchant', file: 'iconPowers_drones.png' },
  { id: 'Item_Slasher_Frenzy', name: 'Feral Frenzy', role: 'killer', group: 'frenzy', killer: 'legion', file: 'iconPowers_feralFrenzy.png' },
  { id: 'Item_Slasher_K33Power', name: 'Hidden Pursuit', role: 'killer', group: 'k33', killer: 'xenomorph', file: 'iconPowers_hiddenPursuit_active.png' },
  { id: 'Item_Slasher_QatarKillerPower', name: 'Of the Abyss', role: 'killer', group: 'qatarkiller', killer: 'demogorgon', file: 'iconPowers_ofTheAbyss.png' },
  { id: 'Item_K43Power', name: 'Omnipresent Evil', role: 'killer', group: 'k43', killer: 'jason', file: 'T_UI_iconPowers_DramaticEntrance.png' },
  { id: 'Item_Slasher_ThrowingKnives', name: 'Showstopper', role: 'killer', group: 'trickster', killer: 'trickster', file: 'iconPowers_Showstopper_01.png' },
  { id: 'Item_Slasher_Blinker', name: 'Spencer\'s Last Breath', role: 'killer', group: 'blinker', killer: 'nurse', file: 'iconPowers_breath.png' },
  { id: 'Item_Slasher_K25Power', name: 'Summons of Pain', role: 'killer', group: 'k25', killer: 'cenobite', file: 'iconPowers_summonsOfPain.png' },
  { id: 'Item_Slasher_K24Power', name: 'T-VIRUS', role: 'killer', group: 'k24', killer: 'nemesis', file: 'iconPowers_T-virus.png' },
  { id: 'Item_Slasher_HarpoonRifle', name: 'The Redeemer', role: 'killer', group: 'harpoon', killer: 'deathslinger', file: 'iconPowers_UK.png' },
  { id: 'Item_Slasher_K37Power', name: 'Vampiric Shift', role: 'killer', group: 'k37', killer: 'dark_lord', file: 'iconPowers_K37_Shapeshift.png' },
  { id: 'Item_Slasher_K36Power', name: 'VILE DARKNESS', role: 'killer', group: 'k36', killer: 'lich', file: 'iconPowers_VileDarkness.png' },
  { id: 'Item_Slasher_K29Power', name: 'Virulent Bound', role: 'killer', group: 'k29', killer: 'mastermind', file: 'iconPowers_virulentBound.png' },
  { id: 'Item_Slasher_CloakBell', name: 'Wailing Bell', role: 'killer', group: 'bell', killer: 'wraith', file: 'iconPowers_bell.png' },
  { id: 'Item_Slasher_Kanobo', name: 'Yamaoka\'s Wrath', role: 'killer', group: 'kanobo', killer: 'oni', file: 'iconPowers_yamaokasWrath.png' },
  { id: 'Item_Slasher_PhaseWalker', name: 'Yamaoka’s Haunting', role: 'killer', group: 'phasewalker', killer: 'spirit', file: 'iconPowers_yamaokasHaunting.png' },
  { id: 'Item_Camper_AlexsToolbox', name: 'Alex\'s Toolbox', role: 'survivor', group: 'alexstoolbox', file: 'iconItems_toolboxAlexs.png' },
  { id: 'Item_Camper_Medkit05', name: 'All Hallows\' Eve Lunchbox', role: 'survivor', group: 'medkit', file: 'iconItems_medkitHalloween.png' },
  { id: 'Item_Camper_RainbowMap', name: 'Annotated Map', role: 'survivor', group: 'map', file: 'iconItems_rainbowMap.png' },
  { id: 'Item_Camper_Flashlight_Anniversary2026', name: 'Banquet Flashlight', role: 'survivor', group: 'flashlight', file: 'T_UI_iconItems_flashlight_anniversary2026.png' },
  { id: 'Item_Camper_Medkit_Anniversary2026', name: 'Banquet Med-Kit', role: 'survivor', group: 'medkit', file: 'T_UI_iconItems_medkit_anniversary2026.png' },
  { id: 'Item_Camper_Toolbox_Anniversary2026', name: 'Banquet Toolbox', role: 'survivor', group: 'toolbox', file: 'T_UI_iconItems_toolbox_anniversary2026.png' },
  { id: 'Item_Camper_MedKit', name: 'Camping Aid Kit', role: 'survivor', group: 'medkit', file: 'iconItems_medkit.png' },
  { id: 'Item_Camper_CommodiousToolbox', name: 'Commodious Toolbox', role: 'survivor', group: 'commodioustoolbox', file: 'iconItems_toolboxCommodious.png' },
  { id: 'Item_Camper_MedKit03', name: 'Emergency Med-kit', role: 'survivor', group: 'medkit', file: 'iconItems_rundownAidKit.png' },
  { id: 'Item_Camper_EngineerToolbox', name: 'Engineer\'s Toolbox', role: 'survivor', group: 'engineertoolbox', file: 'iconItems_toolboxEngineers.png' },
  { id: 'Item_Camper_MedKit02', name: 'First Aid Kit', role: 'survivor', group: 'medkit', file: 'iconItems_firstAidKit.png' },
  { id: 'Item_Camper_Flashlight', name: 'Flashlight', role: 'survivor', group: 'flashlight', file: 'iconItems_flashlight.png' },
  { id: 'Item_Camper_Flashlight_Anniversary2022', name: 'Masquerade Flashlight', role: 'survivor', group: 'flashlight', file: 'iconItems_flashlight_anniversary2022.png' },
  { id: 'Item_Camper_Toolbox_Anniversary2022', name: 'Masquerade Toolbox', role: 'survivor', group: 'toolbox', file: 'iconItems_toolbox_anniversary2022.png' },
  { id: 'Item_Camper_MedKit04', name: 'Ranger Med-kit', role: 'survivor', group: 'medkit', file: 'iconItems_rangersAidKit.png' },
  { id: 'Item_Camper_Flashlight02', name: 'Sport Flashlight', role: 'survivor', group: 'flashlight', file: 'iconItems_flashlightSport.png' },
  { id: 'Item_Camper_Flashlight03', name: 'Utility Flashlight', role: 'survivor', group: 'flashlight', file: 'iconItems_flashlightUtility.png' },
  { id: 'Item_Survivor_VigosFogVial', name: 'Vigo\'s Fog Vial', role: 'survivor', group: 'fogvial', file: 'T_UI_iconItems_vigosFogVial.png' },
];

export const OFFERINGS = [
  { id: 'ArdentRavenWreath', name: 'Ardent Raven Wreath', role: 'killer', file: 'iconFavors_ardentRavenWreath.png' },
  { id: 'BloodyPartyStreamers', name: 'Bloody Party Streamers', role: 'killer', file: 'iconFavors_bloodyPartyStreamers.png' },
  { id: 'EbonyMementoMori', name: 'Ebony Memento Mori', role: 'killer', file: 'iconFavors_momentoMoriEbony.png' },
  { id: 'HeartLocket', name: 'Heart Locket', role: 'killer', file: 'iconFavors_heartLocket.png' },
  { id: 'IvoryMementoMori', name: 'Ivory Memento Mori', role: 'killer', file: 'iconFavors_momentoMoriIvory.png' },
  { id: 'PutridOak', name: 'Putrid Oak', role: 'killer', file: 'iconFavors_putridOak.png' },
  { id: 'Anniversary2024Offering', name: 'SCREECH COBBLER', role: 'killer', file: 'iconsFavors_8thAnniversary.png' },
  { id: 'TanagerWreath', name: 'Tanager Wreath', role: 'killer', file: 'iconFavors_tanagerWreath.png' },
  { id: 'AnnotatedBlueprint', name: 'Annotated Blueprint', role: 'survivor', file: 'iconFavors_annotatedBlueprint.png' },
  { id: 'BoundEnvelope', name: 'Bound Envelope', role: 'survivor', file: 'iconFavors_boundEnvelope.png' },
  { id: 'ClearReagent', name: 'Clear Reagent', role: 'survivor', file: 'iconFavors_clearReagent.png' },
  { id: 'Anniversary2025Offering', name: 'Coconut Scream Pie', role: 'survivor', file: 'T_UI_iconsFavors_9thAnniversary.png' },
  { id: 'CrispleafAmaranthSachet', name: 'Crispleaf Amaranth Sachet', role: 'survivor', file: 'iconFavors_crispleafAmaranthSachet.png' },
  { id: 'EscapeCake', name: 'Escape! Cake', role: 'survivor', file: 'iconFavors_escapeCake.png' },
  { id: 'FragrantSweetWilliam', name: 'Fragrant Sweet William', role: 'survivor', file: 'iconFavors_fragrantSweetWilliam.png' },
  { id: 'PetrifiedOak', name: 'Petrified Oak', role: 'survivor', file: 'iconFavors_petrifiedOak.png' },
  { id: 'SealedEnvelope', name: 'Sealed Envelope', role: 'survivor', file: 'iconFavors_sealedEnvelope.png' },
  { id: 'ShroudofBinding', name: 'Shroud of Separation', role: 'survivor', file: 'iconFavors_shroudOfSeparation.png' },
  { id: 'ShroudofUnion', name: 'Shroud of Union', role: 'survivor', file: 'iconFavors_shroudOfUnion.png' },
  { id: 'Anniversary2026Offering', name: 'Toothy Torte', role: 'survivor', file: 'T_UI_iconsFavors_10thAnniversary.png' },
];

export const ADDONS = [
  { id: 'Addon_Bell_004', name: '"Blind Warrior" - Mud', role: 'killer', group: 'bell' },
  { id: 'Addon_Spark_CalmMuYisNotes', name: '"Calm" - Carter\'s Notes', role: 'killer', group: 'spark', file: 'iconAddon_calmCartersNotes.png' },
  { id: 'Addon_Spark_DisciplineMuYisNotes', name: '"Discipline" - Carter\'s Notes', role: 'killer', group: 'spark', file: 'iconAddon_diciplineCartersNotes.png' },
  { id: 'Addon_Bell_007', name: '"The Beast" - Soot', role: 'killer', group: 'bell', file: 'iconAddon_sootTheBeast.png' },
  { id: 'Addon_K33_20', name: 'Acidic Blood', role: 'killer', group: 'k33', file: 'iconAddon_acidicBlood.png' },
  { id: 'ADDON_LFChainsaw_AwardWinningChili', name: 'Award-Winning Chili', role: 'killer', group: 'lfchainsaw', file: 'iconAddon_awardwinningChili.png' },
  { id: 'Addon_K43_02', name: 'Bent Wheel', role: 'killer', group: 'k43', file: 'T_UI_iconAddon_BentWheel.png' },
  { id: 'Addon_K43_15', name: 'Bloody Magazine', role: 'killer', group: 'k43', file: 'T_UI_iconAddon_BloodyMagazine.png' },
  { id: 'Addon_K43_16', name: 'Burnt Fuse', role: 'killer', group: 'k43', file: 'T_UI_iconAddon_BurntFuse.png' },
  { id: 'Addon_K43_09', name: 'Coroner\'s Coffee', role: 'killer', group: 'k43', file: 'T_UI_iconAddon_CoronersCoffee.png' },
  { id: 'Addon_Chainsaw_002', name: 'Counterweight', role: 'killer', group: 'chainsaw', file: 'iconAddon_counterweight.png' },
  { id: 'Addon_Chainsaw_001', name: 'Dad\'s Boots', role: 'killer', group: 'chainsaw', file: 'iconAddon_dadsBoots.png' },
  { id: 'Addon_K24Power_18', name: 'Depleted Ink Ribbon', role: 'killer', group: 'k24', file: 'iconAddon_depletedInkRibbon.png' },
  { id: 'Addon_K33_05', name: 'Drinking Bird', role: 'killer', group: 'k33', file: 'iconAddon_drinkingBird.png' },
  { id: 'Addon_K29_14', name: 'Egg (Gold)', role: 'killer', group: 'k29' },
  { id: 'Addon_Demogorgon_ElevensSoda', name: 'Eleven\'s Soda', role: 'killer', group: 'demogorgon', file: 'iconAddon_elevensSoda.png' },
  { id: 'ADDON_Frenzy_FilthyBlade', name: 'Filthy Blade', role: 'killer', group: 'frenzy', file: 'iconAddon_filthyBlade.png' },
  { id: 'Addon_K25Power_08', name: 'Flickering Television', role: 'killer', group: 'k25', file: 'iconAddon_flickeringTelevision.png' },
  { id: 'ADDON_Frenzy_FumingMixTape', name: 'Fuming Mix Tape', role: 'killer', group: 'frenzy', file: 'iconAddon_fumingMixtape.png' },
  { id: 'Addon_K43_01', name: 'Garden Claw', role: 'killer', group: 'k43', file: 'T_UI_iconAddon_GardenClaw.png' },
  { id: 'ADDON_Frenzy_IridescentButton', name: 'Iridescent Button', role: 'killer', group: 'frenzy', file: 'iconAddon_iridescentButton.png' },
  { id: 'Addon_Harpoon_IridescentCoin', name: 'Iridescent Coin', role: 'killer', group: 'harpoon', file: 'iconAddon_iridescentCoin.png' },
  { id: 'ADDON_Chainsaw_DoomEngravings', name: 'Iridescent Engravings', role: 'killer', group: 'chainsaw', file: 'iconAddon_iridescentEngravings.png' },
  { id: 'Addon_K25Power_20', name: 'Iridescent Lament Configuration', role: 'killer', group: 'k25', file: 'iconAddon_iridescentLamentConfiguration.png' },
  { id: 'Addon_Trickster_03', name: 'Killing Part Chords', role: 'killer', group: 'trickster', file: 'icons_Addon_KillingPartChords.png' },
  { id: 'Addon_PhaseWalker_FathersGlasses', name: 'Kintsugi Teacup', role: 'killer', group: 'phasewalker', file: 'iconAddon_kintsugiTeacup.png' },
  { id: 'Addon_K36_05', name: 'Lantern of Revealing', role: 'killer', group: 'k36', file: 'iconAddon_LanternOfRevealing.png' },
  { id: 'Addon_K29_06', name: 'Leather Gloves', role: 'killer', group: 'k29', file: 'iconAddon_leatherGloves.png' },
  { id: 'Addon_K37_05', name: 'Magical Ticket', role: 'killer', group: 'k37', file: 'iconAddon_MagicalTicket.png' },
  { id: 'Addon_K24Power_15', name: 'NE-α Parasite', role: 'killer', group: 'k24', file: 'iconAddon_neaParasite.png' },
  { id: 'Addon_PhaseWalker_OrigamiCrane', name: 'Origami Crane', role: 'killer', group: 'phasewalker', file: 'iconAddon_origamiCrane.png' },
  { id: 'Addon_K43_08', name: 'Party Noisemaker', role: 'killer', group: 'k43', file: 'T_UI_iconAddon_PartyNoisemaker.png' },
  { id: 'Addon_Blinker_001', name: 'Plaid Flannel', role: 'killer', group: 'blinker', file: 'iconAddon_plaidFlannel.png' },
  { id: 'Addon_K37_14', name: 'Pocket Watch', role: 'killer', group: 'k37', file: 'Eclair_iconAddon_PocketWatch.png' },
  { id: 'Addon_K29_04', name: 'R.P.D. Shoulder Walkie', role: 'killer', group: 'k29', file: 'iconAddon_RPDShoulderWalkie.png' },
  { id: 'Addon_Kanobo_RenjirosBloodyGlove', name: 'Renjiro’s Bloody Glove', role: 'killer', group: 'kanobo', file: 'iconAddon_renirosBloodyGlove.png' },
  { id: 'Addon_K36_09', name: 'Ring of Spell Storing', role: 'killer', group: 'k36', file: 'iconAddon_RingOfSpellStoring.png' },
  { id: 'Addon_Harpoon_SpitPolishRag', name: 'Spit Polish Rag', role: 'killer', group: 'harpoon', file: 'iconAddon_spitPolishRag.png' },
  { id: 'Addon_Kanobo_SplinteredHull', name: 'Splintered Hull', role: 'killer', group: 'kanobo', file: 'iconAddon_splinteredHull.png' },
  { id: 'Addon_Chainsaw_005', name: 'Steel Toe Boots', role: 'killer', group: 'chainsaw', file: 'iconAddon_steelToeBoots.png' },
  { id: 'Addon_Demogorgon_StickyLining', name: 'Sticky Lining', role: 'killer', group: 'demogorgon', file: 'iconAddon_stickyLining.png' },
  { id: 'ADDON_Frenzy_NastyBlade', name: 'Stylish Sunglasses', role: 'killer', group: 'frenzy', file: 'iconAddon_nastyBlade.png' },
  { id: 'ADDON_LFChainsaw_BeastsMarks', name: 'The Beast\'s Marks', role: 'killer', group: 'lfchainsaw', file: 'iconAddon_theBeastsMark.png' },
  { id: 'Addon_Blinker_005', name: 'Torn Bookmark', role: 'killer', group: 'blinker', file: 'iconAddon_tornBookmark.png' },
  { id: 'Addon_K37_08', name: 'Traveler’s Hat', role: 'killer', group: 'k37', file: 'iconAddon_TravelersHat.png' },
  { id: 'Addon_Trickster_02', name: 'Trick Pouch', role: 'killer', group: 'trickster', file: 'icons_Addon_TrickPouch.png' },
  { id: 'Addon_K29_03', name: 'Unicorn Medallion', role: 'killer', group: 'k29', file: 'iconAddon_unicornMedallion.png' },
  { id: 'Addon_PhaseWalker_WhiteHairRibbon', name: 'White Hair Ribbon', role: 'killer', group: 'phasewalker', file: 'iconAddon_whiteHairRibbon.png' },
  { id: 'Addon_K37_10', name: 'White Wolf Medallion', role: 'killer', group: 'k37', file: 'iconAddon_WhiteWolfMedallion.png' },
  { id: 'Addon_K37_09', name: 'Winged Boots', role: 'killer', group: 'k37', file: 'iconAddon_WingedBoots.png' },
  { id: 'Addon_PhaseWalker_Zori', name: 'Zōri', role: 'killer', group: 'phasewalker', file: 'iconAddon_zori.png' },
  { id: 'ADDON_medkit_abdominaldressing', name: 'Abdominal Dressing', role: 'survivor', group: 'medkit', file: 'iconAddon_abdominalDressing.png' },
  { id: 'Addon_Medkit_008', name: 'Anti-Exhaustion Syringe', role: 'survivor', group: 'medkit', file: 'iconAddon_syringe.png' },
  { id: 'Addon_Medkit_001', name: 'Bandages', role: 'survivor', group: 'medkit', file: 'iconAddon_bandages.png' },
  { id: 'Addon_Map_008', name: 'Battered Tape', role: 'survivor', group: 'map', file: 'T_UI_iconAddon_BatteredTape.png' },
  { id: 'Addon_Flashlight_001', name: 'Battery', role: 'survivor', group: 'flashlight', file: 'iconAddon_battery.png' },
  { id: 'Addon_Toolbox_007', name: 'Brand New Part', role: 'survivor', group: 'toolbox', file: 'iconAddon_brandNewPart.png' },
  { id: 'Addon_Medkit_004', name: 'Butterfly Tape', role: 'survivor', group: 'medkit', file: 'iconAddon_butterflyTape.png' },
  { id: 'Addon_Toolbox_003', name: 'Clean Rag', role: 'survivor', group: 'toolbox', file: 'iconAddon_cleanRag.png' },
  { id: 'Addon_Map_004', name: 'Crimson Stamp', role: 'survivor', group: 'map', file: 'T_UI_iconAddon_CrimsonStamp.png' },
  { id: 'ADDON_toolbox_cuttingwire', name: 'Cutting Wire', role: 'survivor', group: 'toolbox', file: 'iconAddon_cuttingWire.png' },
  { id: 'Addon_Flashlight_003', name: 'Focus Lens', role: 'survivor', group: 'flashlight', file: 'iconAddon_focusLens.png' },
  { id: 'ADDON_medkit_gauzeroll', name: 'Gauze Roll', role: 'survivor', group: 'medkit', file: 'iconAddon_gauseRoll.png' },
  { id: 'Addon_Medkit_002', name: 'Gel Dressings', role: 'survivor', group: 'medkit', file: 'iconAddon_gelDressings.png' },
  { id: 'Addon_Toolbox_005', name: 'Hacksaw', role: 'survivor', group: 'toolbox', file: 'iconAddon_metalSaw.png' },
  { id: 'Addon_Flashlight_002', name: 'Heavy Duty Battery', role: 'survivor', group: 'flashlight', file: 'iconAddon_heavyDutyBattery.png' },
  { id: 'ADDON_flashlight_highendsapphire', name: 'High-end Sapphire lens', role: 'survivor', group: 'flashlight', file: 'iconAddon_highEndSapphireLens.png' },
  { id: 'Addon_Toolbox_008', name: 'Instructions', role: 'survivor', group: 'toolbox', file: 'iconAddon_instructions.png' },
  { id: 'ADDON_flashlight_intensehalogen', name: 'Intense Halogen', role: 'survivor', group: 'flashlight', file: 'iconAddon_intenseHalogen.png' },
  { id: 'Addon_Flashlight_008', name: 'Leather Grip', role: 'survivor', group: 'flashlight', file: 'iconAddon_leatherGrip.png' },
  { id: 'ADDON_flashlight_lonflifebattery', name: 'Long Life Battery', role: 'survivor', group: 'flashlight', file: 'iconAddon_longLifeBattery.png' },
  { id: 'Addon_Flashlight_007', name: 'Low Amp Filament', role: 'survivor', group: 'flashlight', file: 'iconAddon_threadedFilament.png' },
  { id: 'Addon_Medkit_003', name: 'Medical Scissors', role: 'survivor', group: 'medkit', file: 'iconAddon_scissors.png' },
  { id: 'Addon_FogVial_Amplifier', name: 'Mushroom Formula', role: 'survivor', group: 'fogvial', file: 'T_UI_iconAddon_mushroomFormula.png' },
  { id: 'ADDON_flashlight_oddbulb', name: 'Odd Bulb', role: 'survivor', group: 'flashlight', file: 'iconAddon_oddBulb.png' },
  { id: 'Addon_FogVial_DenseFogExtract', name: 'Potent Extract', role: 'survivor', group: 'fogvial', file: 'T_UI_iconAddon_potentExtract.png' },
  { id: 'Addon_Flashlight_005', name: 'Power Bulb', role: 'survivor', group: 'flashlight', file: 'iconAddon_powerBulb.png' },
  { id: 'Addon_Medkit_006', name: 'Rubber Gloves', role: 'survivor', group: 'medkit', file: 'iconAddon_gloves.png' },
  { id: 'ADDON_flashlight_rubbergrip', name: 'Rubber Grip', role: 'survivor', group: 'flashlight', file: 'iconAddon_rubberGrip.png' },
  { id: 'ADDON_medkit_selfadherentwrap', name: 'Self Adherent Wrap', role: 'survivor', group: 'medkit', file: 'iconAddon_selfAdherentWrap.png' },
  { id: 'Addon_Map_007', name: 'Sharpened Flint', role: 'survivor', group: 'map', file: 'T_UI_iconAddon_SharpenedFlint.png' },
  { id: 'ADDON_toolbox_socketswivels', name: 'Socket Swivels', role: 'survivor', group: 'toolbox', file: 'iconAddon_socketSwivels.png' },
  { id: 'Addon_Medkit_005', name: 'Sponge', role: 'survivor', group: 'medkit', file: 'iconAddon_sponge.png' },
  { id: 'ADDON_toolbox_springclamp', name: 'Spring Clamp', role: 'survivor', group: 'toolbox', file: 'iconAddon_springClamp.png' },
  { id: 'Addon_Medkit_007', name: 'Styptic Agent', role: 'survivor', group: 'medkit', file: 'iconAddon_stypticAgent.png' },
  { id: 'ADDON_medkit_surgicalsuture', name: 'Surgical Suture', role: 'survivor', group: 'medkit', file: 'iconAddon_surgicalSuture.png' },
  { id: 'Addon_Flashlight_006', name: 'TIR Optic', role: 'survivor', group: 'flashlight', file: 'iconAddon_tirOptic.png' },
  { id: 'Addon_FogVial_Accelerant', name: 'Volcanic Stone', role: 'survivor', group: 'fogvial', file: 'T_UI_iconAddon_volcanicStone.png' },
  { id: 'Addon_Flashlight_004', name: 'Wide Lens', role: 'survivor', group: 'flashlight', file: 'iconAddon_wideLens.png' },
  { id: 'Addon_Toolbox_002', name: 'Wire Spool', role: 'survivor', group: 'toolbox', file: 'iconAddon_spoolOfWire.png' },
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

/**
 * Dateiname des Bildes im Bucket. Ohne Eintrag im Katalog gibt es keinen –
 * dann bleibt es beim Namenskürzel, statt eine 404 zu erzeugen.
 */
export const loadoutFile = (kind, id) => loadoutEntry(kind, id)?.file ?? null;

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
 * Add-ons zu einem Item bzw. einer Power. Ohne gewähltes Item steht die ganze
 * Liste zur Auswahl.
 *
 * Kennt der Katalog zu dem Item noch keine Add-ons, kommt ebenfalls die volle
 * Liste – sonst stünde man vor einem leeren Feld und käme gar nicht weiter.
 */
export function addonsForItem(role, itemId) {
  const group = loadoutEntry('item', itemId)?.group ?? null;
  const list = loadoutList('addon', role);
  if (!group) return list;

  const matching = list.filter((entry) => entry.group === group);
  return matching.length ? matching : list;
}

/** Power eines Killers, sofern im Katalog hinterlegt – sonst null. */
export function powerForKiller(killerId) {
  if (!killerId) return null;
  return ITEMS.find((entry) => entry.killer === killerId)?.id ?? null;
}

/** Bis zu zwei Add-ons pro Match, doppelte und leere fliegen raus. */
export const MAX_ADDONS = 2;
export const cleanAddons = (list) =>
  [...new Set((list ?? []).filter(Boolean))].slice(0, MAX_ADDONS);

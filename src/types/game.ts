export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ElementType = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';

export type BuildingType = 
  | 'main_hall' 
  | 'dormitory' 
  | 'library' 
  | 'classroom' 
  | 'training_ground' 
  | 'alchemy_lab' 
  | 'magic_tower' 
  | 'warehouse';

export type CourseType = 
  | 'basic_magic'
  | 'elemental_magic'
  | 'combat_training'
  | 'alchemy'
  | 'spells'
  | 'history'
  | 'advanced_elemental'
  | 'battle_magic'
  | 'alchemy_mastery'
  | 'forbidden_spells'
  | 'tactical_command';

export type MasteryLevel = 'novice' | 'apprentice' | 'adept' | 'expert' | 'master' | 'grandmaster';

export type StudentClass = 
  | 'novice'
  | 'warrior'
  | 'mage'
  | 'archer'
  | 'cleric'
  | 'assassin'
  | 'paladin'
  | 'warlock'
  | 'ranger'
  | 'sage';

export type ClassTier = 'basic' | 'advanced' | 'elite' | 'legendary';

export type DungeonDifficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface Resources {
  gold: number;
  mana: number;
  exp: number;
  crystals: number;
  materials: number;
}

export interface ResourceRates {
  gold: number;
  mana: number;
  exp: number;
  crystals: number;
  materials: number;
}

export interface BuildingDef {
  id: BuildingType;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  baseCost: Resources;
  costMultiplier: number;
  baseEffect: ResourceRates;
  effectMultiplier: number;
  special?: string;
}

export interface Building {
  type: BuildingType;
  level: number;
  x: number;
  y: number;
  constructed: boolean;
}

export interface StudentStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
  critRate: number;
  critDamage: number;
}

export interface Student {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;
  exp: number;
  element: ElementType;
  stats: StudentStats;
  baseStats: StudentStats;
  skills: string[];
  avatar: string;
  status: 'idle' | 'studying' | 'training' | 'dungeon' | 'resting' | 'mastering' | 'promoting';
  currentCourseId?: string;
  studyProgress: number;
  morale: number;
  fatigue: number;
  maxFatigue: number;
  equipment: Record<EquipmentSlot, string | null>;
  activePotions: string[];
  class: StudentClass;
  classTier: ClassTier;
  masteries: CourseMastery[];
  promotionHistory: ClassPromotion[];
  classExp: number;
  classLevel: number;
  availableForPromotion: boolean;
  currentPromotionTarget?: StudentClass;
}

export interface CourseMastery {
  courseType: CourseType;
  level: MasteryLevel;
  exp: number;
  expToNext: number;
  totalCompleted: number;
  bonuses: Partial<StudentStats>;
}

export interface ClassDef {
  id: StudentClass;
  name: string;
  description: string;
  icon: string;
  tier: ClassTier;
  requiredLevel: number;
  requiredMasteries: { courseType: CourseType; level: MasteryLevel }[];
  requiredStats: Partial<StudentStats>;
  statGrowth: Partial<StudentStats>;
  elementBonus?: ElementType;
  skills: string[];
  unlocksClasses?: StudentClass[];
  goldCost: number;
  crystalsCost: number;
}

export interface ClassPromotion {
  fromClass: StudentClass;
  toClass: StudentClass;
  completedAt: number;
  questRequired?: boolean;
  questCompleted?: boolean;
}

export interface CourseDef {
  id: CourseType;
  name: string;
  description: string;
  icon: string;
  duration: number;
  baseExp: number;
  statBoosts: Partial<StudentStats>;
  elementBonus?: ElementType;
  requiredLevel: number;
  goldCost: number;
  manaCost: number;
  masteryExpPerComplete: number;
  unlockRequirements?: {
    requiredMasteries?: { courseType: CourseType; level: MasteryLevel }[];
    requiredClass?: StudentClass;
    requiredAcademyLevel?: number;
  };
  isAdvanced?: boolean;
}

export interface Course {
  id: string;
  courseType: CourseType;
  studentIds: string[];
  startTime: number;
  duration: number;
  progress: number;
}

export interface Enemy {
  id: string;
  name: string;
  element: ElementType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
  icon: string;
}

export interface DungeonDef {
  id: string;
  name: string;
  description: string;
  difficulty: DungeonDifficulty;
  requiredLevel: number;
  enemies: Enemy[];
  rewards: Resources;
  materialsReward: { [key: string]: number };
  staminaCost: number;
}

export interface DungeonResult {
  victory: boolean;
  rewards: Resources;
  materials: { [key: string]: number };
  expGained: number;
  survivors: string[];
  battleLog: BattleLogEntry[];
}

export interface BattleLogEntry {
  turn: number;
  attacker: string;
  target: string;
  damage: number;
  isCrit: boolean;
  isHeal: boolean;
  message: string;
}

export interface BattleUnit {
  id: string;
  name: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
  element: ElementType;
  icon: string;
  alive: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  autoSave: boolean;
  language: string;
  animationSpeed: number;
}

export interface MasteryConfig {
  expPerLevel: number[];
  statBonuses: Record<MasteryLevel, Partial<StudentStats>>;
  names: Record<MasteryLevel, string>;
  colors: Record<MasteryLevel, string>;
}

export interface PromotionQuest {
  id: string;
  studentId: string;
  targetClass: StudentClass;
  steps: {
    id: string;
    description: string;
    type: 'course' | 'dungeon' | 'stat' | 'item';
    target: number;
    current: number;
    completed: boolean;
  }[];
  startedAt: number;
  completedAt?: number;
}

export interface GameState {
  resources: Resources;
  buildings: Building[];
  students: Student[];
  courses: Course[];
  day: number;
  time: number;
  academyName: string;
  academyLevel: number;
  academyExp: number;
  settings: GameSettings;
  lastSaveTime: number;
  dungeonRuns: number;
  totalVictories: number;
  achievements: string[];
  schedule: DailySchedule;
  recruitHistory: RecruitHistoryEntry[];
  recruitStats: RecruitStats;
  pityCounters: PityCounter[];
  limitedPoolEndTimes: LimitedPoolEndTimes;
  equipment: Equipment[];
  potions: Potion[];
  materials: Record<MaterialType, number>;
  craftingJobs: CraftingJob[];
  promotionQuests: PromotionQuest[];
  totalPromotions: number;
  totalMasteryGrandmasters: number;
}

export type ActivityType = 
  | 'study'
  | 'train'
  | 'dungeon'
  | 'rest'
  | 'idle';

export type ScheduleStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface ScheduleEntry {
  id: string;
  studentId: string;
  activity: ActivityType;
  startTime: number;
  duration: number;
  courseType?: CourseType;
  dungeonId?: string;
  status?: ScheduleStatus;
  executedAt?: number;
  result?: string;
}

export interface DailySchedule {
  day: number;
  entries: ScheduleEntry[];
  autoExecute: boolean;
}

export type FatigueLevel = 'energetic' | 'normal' | 'tired' | 'exhausted';

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

export type PoolType = 'standard' | 'rate_up_epic' | 'rate_up_legendary';

export interface PityConfig {
  softPityStart: number;
  hardPity: number;
  guaranteedRarity: Rarity;
}

export interface RateUpConfig {
  rarity: Rarity;
  bonusMultiplier: number;
  element?: ElementType;
}

export interface RecruitPoolDef {
  id: PoolType;
  name: string;
  icon: string;
  description: string;
  cost: { gold: number; crystals: number };
  tenCost: { gold: number; crystals: number };
  pity: PityConfig;
  rateUp?: RateUpConfig;
  isLimited: boolean;
  defaultDurationMs?: number;
}

export interface RecruitHistoryEntry {
  id: string;
  poolId: PoolType;
  studentId: string;
  studentName: string;
  rarity: Rarity;
  element: ElementType;
  avatar: string;
  cost: { gold: number; crystals: number };
  timestamp: number;
  isPity: boolean;
  isRateUp: boolean;
}

export interface RecruitStats {
  totalPulls: number;
  totalGold: number;
  totalCrystals: number;
  rarityCount: Record<Rarity, number>;
  pityTriggered: number;
  rateUpHits: number;
}

export interface PityCounter {
  poolId: PoolType;
  currentCount: number;
  sinceLastEpic: number;
  sinceLastLegendary: number;
}

export interface LimitedPoolEndTimes {
  rate_up_epic?: number;
  rate_up_legendary?: number;
}

export type ModuleType =
  | 'overview'
  | 'construction'
  | 'recruitment'
  | 'courses'
  | 'dungeon'
  | 'settlement'
  | 'schedule'
  | 'settings'
  | 'equipment'
  | 'alchemy';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'relic';

export type EquipmentType = 'weapon' | 'armor' | 'accessory' | 'relic';

export type PotionType = 'hp' | 'attack' | 'defense' | 'magic' | 'speed' | 'crit' | 'fatigue' | 'morale';

export type MaterialType = 
  | 'wood' | 'herb' | 'stone' | 'crystal' | 'gem'
  | 'fire_crystal' | 'ember' | 'dragon_scale'
  | 'dark_crystal' | 'soul_stone' | 'dragon_heart'
  | 'iron_ore' | 'magic_thread' | 'ancient_rune';

export interface EquipmentDef {
  name: string;
  type: EquipmentType;
  slot: EquipmentSlot;
  rarity: Rarity;
  level: number;
  stats: Partial<StudentStats>;
  bonuses: Partial<StudentStats>;
  description: string;
  icon: string;
  element?: ElementType;
  setBonus?: string;
}

export interface Equipment {
  id: string;
  defId: string;
  slot: EquipmentSlot;
  level: number;
  isEquipped: boolean;
  equippedBy?: string;
  createdAt: number;
}

export interface PotionDef {
  name: string;
  type: PotionType;
  rarity: Rarity;
  effect: Partial<StudentStats> & { duration?: number; value?: number };
  effectType: 'buff' | 'heal';
  effectValue: number;
  duration: number;
  description: string;
  icon: string;
}

export interface Potion {
  id: string;
  defId: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: number;
  endTime?: number;
  quantity: number;
}

export interface Material {
  type: MaterialType;
  name: string;
  icon: string;
  description: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  type: 'equipment' | 'potion';
  outputId: string;
  outputQuantity: number;
  materials: { type: MaterialType; quantity: number }[];
  goldCost: number;
  manaCost: number;
  craftTime: number;
  requiredAlchemyLevel: number;
  icon: string;
}

export interface CraftingJob {
  id: string;
  recipeId: string;
  startTime: number;
  endTime: number;
  completed: boolean;
  claimed: boolean;
}

export interface EquipmentInventory {
  items: Equipment[];
}

export interface PotionInventory {
  items: Potion[];
}

export interface MaterialInventory {
  materials: Record<MaterialType, number>;
}

export interface DungeonResult {
  victory: boolean;
  rewards: Resources;
  materials: { [key: string]: number };
  expGained: number;
  survivors: string[];
  battleLog: BattleLogEntry[];
  equipmentDrops: Equipment[];
  potionDrops: Potion[];
}

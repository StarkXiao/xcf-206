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
  | 'history';

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
  skills: string[];
  avatar: string;
  status: 'idle' | 'studying' | 'training' | 'dungeon' | 'resting';
  currentCourseId?: string;
  studyProgress: number;
  morale: number;
  fatigue: number;
  maxFatigue: number;
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
  endTime?: number;
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

export type ModuleType =
  | 'overview'
  | 'construction'
  | 'recruitment'
  | 'courses'
  | 'dungeon'
  | 'settlement'
  | 'schedule'
  | 'settings';

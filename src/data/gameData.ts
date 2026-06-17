import { BuildingDef, CourseDef, DungeonDef, Rarity, ElementType, StudentStats, RecruitPoolDef } from '../types/game';

export const BUILDING_DEFS: Record<string, BuildingDef> = {
  main_hall: {
    id: 'main_hall',
    name: '主教学楼',
    description: '学院的核心建筑，提升学院等级解锁更多功能',
    icon: '🏛️',
    maxLevel: 10,
    baseCost: { gold: 0, mana: 0, exp: 0, crystals: 0, materials: 0 },
    costMultiplier: 1.8,
    baseEffect: { gold: 10, mana: 5, exp: 2, crystals: 0, materials: 0 },
    effectMultiplier: 1.3,
    special: '学院等级受此建筑等级限制',
  },
  dormitory: {
    id: 'dormitory',
    name: '学员宿舍',
    description: '提升学员上限，恢复学员精力和士气',
    icon: '🏠',
    maxLevel: 10,
    baseCost: { gold: 200, mana: 50, exp: 0, crystals: 0, materials: 10 },
    costMultiplier: 1.6,
    baseEffect: { gold: 0, mana: 0, exp: 0, crystals: 0, materials: 0 },
    effectMultiplier: 1.2,
    special: '每级+3学员上限，+10%士气恢复',
  },
  library: {
    id: 'library',
    name: '魔法图书馆',
    description: '提升学习效率，产出魔法结晶',
    icon: '📚',
    maxLevel: 10,
    baseCost: { gold: 300, mana: 100, exp: 0, crystals: 0, materials: 20 },
    costMultiplier: 1.7,
    baseEffect: { gold: 0, mana: 8, exp: 5, crystals: 1, materials: 0 },
    effectMultiplier: 1.25,
    special: '课程经验+10%/级',
  },
  classroom: {
    id: 'classroom',
    name: '元素教室',
    description: '开设更多课程，提升教学质量',
    icon: '🏫',
    maxLevel: 10,
    baseCost: { gold: 250, mana: 80, exp: 0, crystals: 0, materials: 15 },
    costMultiplier: 1.65,
    baseEffect: { gold: 5, mana: 10, exp: 8, crystals: 0, materials: 0 },
    effectMultiplier: 1.22,
    special: '同时开设课程数+1/级',
  },
  training_ground: {
    id: 'training_ground',
    name: '训练场地',
    description: '提升学员战斗属性，试炼奖励加成',
    icon: '⚔️',
    maxLevel: 10,
    baseCost: { gold: 350, mana: 60, exp: 0, crystals: 0, materials: 30 },
    costMultiplier: 1.75,
    baseEffect: { gold: 0, mana: 0, exp: 10, crystals: 0, materials: 2 },
    effectMultiplier: 1.28,
    special: '学员攻击+5%/级，试炼奖励+5%/级',
  },
  alchemy_lab: {
    id: 'alchemy_lab',
    name: '炼金实验室',
    description: '生产魔法材料和药剂',
    icon: '⚗️',
    maxLevel: 10,
    baseCost: { gold: 400, mana: 120, exp: 0, crystals: 5, materials: 25 },
    costMultiplier: 1.8,
    baseEffect: { gold: 8, mana: 5, exp: 0, crystals: 0, materials: 5 },
    effectMultiplier: 1.3,
    special: '材料产出+15%/级',
  },
  magic_tower: {
    id: 'magic_tower',
    name: '魔法塔',
    description: '大量产出魔力，解锁高级魔法',
    icon: '🗼',
    maxLevel: 10,
    baseCost: { gold: 500, mana: 200, exp: 0, crystals: 10, materials: 40 },
    costMultiplier: 1.85,
    baseEffect: { gold: 0, mana: 20, exp: 0, crystals: 2, materials: 0 },
    effectMultiplier: 1.32,
    special: '魔力产出+25%/级',
  },
  warehouse: {
    id: 'warehouse',
    name: '资源仓库',
    description: '提升资源存储上限',
    icon: '🏪',
    maxLevel: 10,
    baseCost: { gold: 150, mana: 30, exp: 0, crystals: 0, materials: 50 },
    costMultiplier: 1.5,
    baseEffect: { gold: 3, mana: 2, exp: 0, crystals: 0, materials: 3 },
    effectMultiplier: 1.2,
    special: '资源上限+50%/级',
  },
};

export const COURSE_DEFS: Record<string, CourseDef> = {
  basic_magic: {
    id: 'basic_magic',
    name: '基础魔法理论',
    description: '学习魔法的基础知识，全面提升各项属性',
    icon: '📖',
    duration: 60,
    baseExp: 50,
    statBoosts: { maxHp: 5, attack: 2, defense: 2, magic: 3, speed: 1 },
    requiredLevel: 1,
    goldCost: 50,
    manaCost: 20,
  },
  elemental_magic: {
    id: 'elemental_magic',
    name: '元素魔法专修',
    description: '深入研究特定元素的魔法',
    icon: '🔮',
    duration: 90,
    baseExp: 80,
    statBoosts: { magic: 8, attack: 3, maxHp: 2 },
    requiredLevel: 3,
    goldCost: 100,
    manaCost: 50,
  },
  combat_training: {
    id: 'combat_training',
    name: '实战剑术训练',
    description: '提升战斗技巧和体能',
    icon: '🗡️',
    duration: 75,
    baseExp: 70,
    statBoosts: { attack: 6, defense: 4, maxHp: 10, speed: 2 },
    requiredLevel: 2,
    goldCost: 80,
    manaCost: 30,
  },
  alchemy: {
    id: 'alchemy',
    name: '炼金术入门',
    description: '学习制作药剂和魔法物品',
    icon: '🧪',
    duration: 120,
    baseExp: 100,
    statBoosts: { magic: 5, defense: 3, maxHp: 5 },
    requiredLevel: 4,
    goldCost: 150,
    manaCost: 80,
  },
  spells: {
    id: 'spells',
    name: '高级咒语学',
    description: '掌握强大的攻击与辅助咒语',
    icon: '✨',
    duration: 100,
    baseExp: 120,
    statBoosts: { magic: 10, attack: 5, critRate: 2, critDamage: 5 },
    requiredLevel: 5,
    goldCost: 200,
    manaCost: 100,
  },
  history: {
    id: 'history',
    name: '魔法史与战略',
    description: '学习历史战役，提升战略思维',
    icon: '📜',
    duration: 80,
    baseExp: 60,
    statBoosts: { defense: 5, speed: 3, magic: 3, maxHp: 5 },
    requiredLevel: 2,
    goldCost: 70,
    manaCost: 25,
  },
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

export const RARITY_NAMES: Record<Rarity, string> = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export const RARITY_MULTIPLIERS: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.3,
  rare: 1.7,
  epic: 2.2,
  legendary: 3.0,
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 14,
  epic: 5,
  legendary: 1,
};

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#EF4444',
  water: '#3B82F6',
  earth: '#84CC16',
  wind: '#22D3EE',
  light: '#FCD34D',
  dark: '#6366F1',
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  earth: '土',
  wind: '风',
  light: '光',
  dark: '暗',
};

export const ELEMENT_ICONS: Record<ElementType, string> = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  wind: '🌪️',
  light: '☀️',
  dark: '🌙',
};

export const STUDENT_FIRST_NAMES = [
  '阿尔', '艾琳', '凯恩', '莉娜', '塞斯', '米拉', '里昂', '苏菲',
  '奥斯卡', '艾米', '雷克斯', '露娜', '马库斯', '克洛伊', '亚历克斯', '伊莎贝拉',
  '尼古拉斯', '维多利亚', '威廉', '凯瑟琳', '詹姆斯', '艾玛', '亨利', '奥利维亚',
];

export const STUDENT_LAST_NAMES = [
  '温德', '斯塔克', '格雷', '布莱克', '怀特', '格林', '布朗', '威尔逊',
  '摩尔', '泰勒', '安德森', '杰克逊', '马丁', '李', '汤普森', '加西亚',
  '马丁内斯', '罗宾逊', '克拉克', '罗德里格斯', '刘易斯', '李', '沃克', '霍尔',
];

export const AVATARS = ['🧙‍♂️', '🧙‍♀️', '🧝‍♂️', '🧝‍♀️', '🧛', '🧜', '🦹', '🦸', '🥷', '👸', '🤴', '🧑‍🎓'];

export const BASE_STUDENT_STATS: StudentStats = {
  hp: 100,
  maxHp: 100,
  attack: 10,
  defense: 8,
  magic: 12,
  speed: 10,
  critRate: 5,
  critDamage: 150,
};

export const DUNGEON_DEFS: DungeonDef[] = [
  {
    id: 'forest_1',
    name: '迷雾森林',
    description: '初学者的试炼场，栖息着低级魔兽',
    difficulty: 'easy',
    requiredLevel: 1,
    enemies: [
      { id: 'goblin_1', name: '哥布林', element: 'earth', hp: 80, maxHp: 80, attack: 8, defense: 4, magic: 2, speed: 8, icon: '👺' },
      { id: 'wolf_1', name: '森林狼', element: 'wind', hp: 60, maxHp: 60, attack: 12, defense: 3, magic: 0, speed: 15, icon: '🐺' },
    ],
    rewards: { gold: 150, mana: 50, exp: 100, crystals: 1, materials: 10 },
    materialsReward: { wood: 5, herb: 3 },
    staminaCost: 10,
  },
  {
    id: 'cave_1',
    name: '水晶洞窟',
    description: '蕴藏丰富矿石的地下洞穴',
    difficulty: 'normal',
    requiredLevel: 5,
    enemies: [
      { id: 'bat_1', name: '吸血蝙蝠', element: 'dark', hp: 100, maxHp: 100, attack: 15, defense: 5, magic: 8, speed: 18, icon: '🦇' },
      { id: 'golem_1', name: '石头人', element: 'earth', hp: 200, maxHp: 200, attack: 18, defense: 20, magic: 0, speed: 5, icon: '🗿' },
      { id: 'slime_1', name: '水晶史莱姆', element: 'water', hp: 120, maxHp: 120, attack: 10, defense: 10, magic: 12, speed: 6, icon: '💎' },
    ],
    rewards: { gold: 400, mana: 150, exp: 300, crystals: 5, materials: 30 },
    materialsReward: { crystal: 8, stone: 15, gem: 2 },
    staminaCost: 20,
  },
  {
    id: 'volcano_1',
    name: '熔岩火山',
    description: '火焰元素生物的领地',
    difficulty: 'hard',
    requiredLevel: 10,
    enemies: [
      { id: 'imp_1', name: '火焰小鬼', element: 'fire', hp: 180, maxHp: 180, attack: 25, defense: 10, magic: 20, speed: 20, icon: '👿' },
      { id: 'lava_1', name: '熔岩巨兽', element: 'fire', hp: 400, maxHp: 400, attack: 35, defense: 25, magic: 15, speed: 8, icon: '🐲' },
      { id: 'phoenix_1', name: '火凤凰雏鸟', element: 'fire', hp: 250, maxHp: 250, attack: 30, defense: 15, magic: 40, speed: 25, icon: '🦅' },
    ],
    rewards: { gold: 1000, mana: 400, exp: 800, crystals: 15, materials: 80 },
    materialsReward: { fire_crystal: 12, ember: 20, dragon_scale: 3 },
    staminaCost: 35,
  },
  {
    id: 'abyss_1',
    name: '暗影深渊',
    description: '传说级的禁地，强大的黑暗生物在此盘踞',
    difficulty: 'nightmare',
    requiredLevel: 15,
    enemies: [
      { id: 'wraith_1', name: '幽灵', element: 'dark', hp: 300, maxHp: 300, attack: 40, defense: 15, magic: 50, speed: 30, icon: '👻' },
      { id: 'demon_1', name: '恶魔领主', element: 'dark', hp: 600, maxHp: 600, attack: 55, defense: 35, magic: 45, speed: 18, icon: '😈' },
      { id: 'dragon_1', name: '暗影巨龙', element: 'dark', hp: 1000, maxHp: 1000, attack: 70, defense: 50, magic: 60, speed: 22, icon: '🐉' },
    ],
    rewards: { gold: 3000, mana: 1200, exp: 2500, crystals: 50, materials: 250 },
    materialsReward: { dark_crystal: 30, soul_stone: 15, dragon_heart: 1 },
    staminaCost: 60,
  },
];

export const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  nightmare: '噩梦',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10B981',
  normal: '#3B82F6',
  hard: '#F59E0B',
  nightmare: '#EF4444',
};

export const SKILLS = [
  { name: '火球术', element: 'fire', damage: 1.5, description: '释放火焰弹造成150%攻击伤害' },
  { name: '治愈术', element: 'light', heal: 0.3, description: '恢复30%最大生命值' },
  { name: '冰霜箭', element: 'water', damage: 1.3, description: '发射冰箭造成130%伤害并减速' },
  { name: '岩石护盾', element: 'earth', buff: 'defense', description: '提升防御50%持续3回合' },
  { name: '风刃', element: 'wind', damage: 1.2, hits: 2, description: '发射两道风刃各造成120%伤害' },
  { name: '暗影打击', element: 'dark', damage: 1.8, description: '暗影攻击造成180%伤害' },
  { name: '神圣之光', element: 'light', damage: 1.4, heal: 0.1, description: '造成140%伤害并恢复10%生命' },
  { name: '连环闪电', element: 'wind', damage: 1.1, hits: 3, description: '连续3次闪电攻击各110%伤害' },
];

export const INITIAL_RESOURCES = {
  gold: 1000,
  mana: 500,
  exp: 0,
  crystals: 20,
  materials: 100,
};

export const STUDENT_CAPACITY_BASE = 5;
export const STUDENT_CAPACITY_PER_LEVEL = 3;

export const FATIGUE_CONFIG = {
  BASE_MAX_FATIGUE: 100,
  LEVEL_BONUS: 5,
  STUDY_COST_PER_MINUTE: 1,
  DUNGEON_COST_BASE: 20,
  DUNGEON_COST_PER_DIFFICULTY: { easy: 10, normal: 20, hard: 35, nightmare: 50 },
  REST_RECOVERY_PER_MINUTE: 2,
  DAILY_RECOVERY_BASE: 30,
  DORM_BONUS_PER_LEVEL: 10,
  MORALE_BONUS_THRESHOLD: 80,
  MORALE_BONUS_MULTIPLIER: 1.5,
  FATIGUE_PENALTY_THRESHOLD: 50,
  FATIGUE_PENALTY_MULTIPLIER: 0.7,
  EXHAUSTION_THRESHOLD: 80,
  EXHAUSTION_PENALTY_MULTIPLIER: 0.4,
};

export const ACTIVITY_NAMES: Record<string, string> = {
  study: '学习',
  train: '训练',
  dungeon: '试炼',
  rest: '休息',
  idle: '空闲',
};

export const ACTIVITY_ICONS: Record<string, string> = {
  study: '📖',
  train: '⚔️',
  dungeon: '🗺️',
  rest: '😴',
  idle: '💤',
};

export const ACTIVITY_COLORS: Record<string, string> = {
  study: 'from-blue-600 to-cyan-500',
  train: 'from-red-600 to-orange-500',
  dungeon: 'from-purple-600 to-pink-500',
  rest: 'from-green-600 to-emerald-500',
  idle: 'from-gray-600 to-slate-500',
};

export const TIME_CONFIG = {
  MINUTES_PER_DAY: 1440,
  TICK_INTERVAL_MS: 1000,
  MINUTES_PER_TICK: 1,
  MORNING_START: 360,
  EVENING_START: 1080,
  NIGHT_START: 1320,
};

export const RECRUIT_POOL_DEFS: Record<string, RecruitPoolDef> = {
  standard: {
    id: 'standard',
    name: '常驻卡池',
    icon: '🌀',
    description: '标准招募池，概率稳定，保底90抽必出史诗+',
    cost: { gold: 200, crystals: 0 },
    tenCost: { gold: 1800, crystals: 1 },
    pity: { softPityStart: 75, hardPity: 90, guaranteedRarity: 'epic' },
    isLimited: false,
  },
  rate_up_epic: {
    id: 'rate_up_epic',
    name: '史诗UP池',
    icon: '💜',
    description: '限时概率UP！史诗出现率翻倍，保底60抽必出史诗',
    cost: { gold: 200, crystals: 1 },
    tenCost: { gold: 1800, crystals: 9 },
    pity: { softPityStart: 50, hardPity: 60, guaranteedRarity: 'epic' },
    rateUp: { rarity: 'epic', bonusMultiplier: 2.0, element: 'light' },
    isLimited: true,
    endTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
  },
  rate_up_legendary: {
    id: 'rate_up_legendary',
    name: '传说UP池',
    icon: '🌟',
    description: '限时概率UP！传说出现率大幅提升，保底120抽必出传说',
    cost: { gold: 0, crystals: 10 },
    tenCost: { gold: 0, crystals: 90 },
    pity: { softPityStart: 90, hardPity: 120, guaranteedRarity: 'legendary' },
    rateUp: { rarity: 'legendary', bonusMultiplier: 3.0, element: 'dark' },
    isLimited: true,
    endTime: Date.now() + 3 * 24 * 60 * 60 * 1000,
  },
};

export const POOL_RARITY_WEIGHTS: Record<string, Record<Rarity, number>> = {
  standard: { common: 50, uncommon: 30, rare: 14, epic: 5, legendary: 1 },
  rate_up_epic: { common: 40, uncommon: 25, rare: 18, epic: 14, legendary: 3 },
  rate_up_legendary: { common: 40, uncommon: 25, rare: 18, epic: 10, legendary: 7 },
};

import { Rarity, ElementType, Student, StudentStats, BattleUnit, BattleLogEntry, DungeonResult, Resources, Building, Enemy, FatigueLevel, ScheduleEntry, ActivityType, TimeOfDay } from '../types/game';
import {
  RARITY_WEIGHTS,
  RARITY_MULTIPLIERS,
  BASE_STUDENT_STATS,
  STUDENT_FIRST_NAMES,
  STUDENT_LAST_NAMES,
  AVATARS,
  BUILDING_DEFS,
  ELEMENT_NAMES,
  SKILLS,
  FATIGUE_CONFIG,
  TIME_CONFIG,
} from '../data/gameData';

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function weightedRandomRarity(): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS) as [Rarity, number][]) {
    rand -= weight;
    if (rand <= 0) return rarity;
  }
  return 'common';
}

export function randomElement(): ElementType {
  const elements: ElementType[] = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
  return pickRandom(elements);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateStudentName(): string {
  return `${pickRandom(STUDENT_FIRST_NAMES)}·${pickRandom(STUDENT_LAST_NAMES)}`;
}

export function generateStudentStats(rarity: Rarity, element: ElementType): StudentStats {
  const multiplier = RARITY_MULTIPLIERS[rarity];
  const elementBonus: Record<ElementType, Partial<StudentStats>> = {
    fire: { attack: 5, magic: 3 },
    water: { maxHp: 15, defense: 3 },
    earth: { defense: 5, maxHp: 10 },
    wind: { speed: 5, critRate: 2 },
    light: { magic: 5, critDamage: 10 },
    dark: { attack: 3, magic: 4, critRate: 3 },
  };
  const bonus = elementBonus[element];
  const variance = () => randomInt(-2, 2);
  return {
    hp: Math.floor((BASE_STUDENT_STATS.hp + (bonus.maxHp || 0) + variance() * 2) * multiplier),
    maxHp: Math.floor((BASE_STUDENT_STATS.maxHp + (bonus.maxHp || 0) + variance() * 2) * multiplier),
    attack: Math.floor((BASE_STUDENT_STATS.attack + (bonus.attack || 0) + variance()) * multiplier),
    defense: Math.floor((BASE_STUDENT_STATS.defense + (bonus.defense || 0) + variance()) * multiplier),
    magic: Math.floor((BASE_STUDENT_STATS.magic + (bonus.magic || 0) + variance()) * multiplier),
    speed: Math.floor((BASE_STUDENT_STATS.speed + (bonus.speed || 0) + variance()) * multiplier),
    critRate: Math.floor((BASE_STUDENT_STATS.critRate + (bonus.critRate || 0)) * multiplier),
    critDamage: Math.floor((BASE_STUDENT_STATS.critDamage + (bonus.critDamage || 0)) * multiplier),
  };
}

export function generateStudent(): Student {
  const rarity = weightedRandomRarity();
  const element = randomElement();
  const stats = generateStudentStats(rarity, element);
  const skills: string[] = [];
  const elementSkills = SKILLS.filter((s) => s.element === element);
  if (elementSkills.length > 0) {
    skills.push(pickRandom(elementSkills).name);
  }
  if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
    const otherSkills = SKILLS.filter((s) => !skills.includes(s.name));
    if (otherSkills.length > 0) skills.push(pickRandom(otherSkills).name);
  }
  if (rarity === 'epic' || rarity === 'legendary') {
    const moreSkills = SKILLS.filter((s) => !skills.includes(s.name));
    if (moreSkills.length > 0) skills.push(pickRandom(moreSkills).name);
  }
  const maxFatigue = FATIGUE_CONFIG.BASE_MAX_FATIGUE + 1 * FATIGUE_CONFIG.LEVEL_BONUS;
  return {
    id: generateId(),
    name: generateStudentName(),
    rarity,
    level: 1,
    exp: 0,
    element,
    stats,
    skills,
    avatar: pickRandom(AVATARS),
    status: 'idle',
    studyProgress: 0,
    morale: 100,
    fatigue: 0,
    maxFatigue,
  };
}

export function calculateBuildingDailyOutput(building: Building): Resources {
  const def = BUILDING_DEFS[building.type];
  if (!building.constructed || building.level === 0) {
    return { gold: 0, mana: 0, exp: 0, crystals: 0, materials: 0 };
  }
  const mult = Math.pow(def.effectMultiplier, building.level - 1);
  return {
    gold: Math.floor(def.baseEffect.gold * mult * building.level),
    mana: Math.floor(def.baseEffect.mana * mult * building.level),
    exp: Math.floor(def.baseEffect.exp * mult * building.level),
    crystals: Math.floor(def.baseEffect.crystals * mult),
    materials: Math.floor(def.baseEffect.materials * mult * building.level),
  };
}

export function calculateTotalDailyOutput(buildings: Building[]): Resources {
  const total: Resources = { gold: 0, mana: 0, exp: 0, crystals: 0, materials: 0 };
  for (const building of buildings) {
    const output = calculateBuildingDailyOutput(building);
    total.gold += output.gold;
    total.mana += output.mana;
    total.exp += output.exp;
    total.crystals += output.crystals;
    total.materials += output.materials;
  }
  return total;
}

function getElementMultiplier(attacker: ElementType, defender: ElementType): number {
  const advantages: Record<ElementType, ElementType> = {
    fire: 'wind',
    water: 'fire',
    earth: 'water',
    wind: 'earth',
    light: 'dark',
    dark: 'light',
  };
  if (advantages[attacker] === defender) return 1.5;
  if (advantages[defender] === attacker) return 0.7;
  return 1.0;
}

function calculateDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  useMagic: boolean = false
): { damage: number; isCrit: boolean } {
  const atk = useMagic ? attacker.magic : attacker.attack;
  const def = defender.defense;
  const elementMult = getElementMultiplier(attacker.element, defender.element);
  const isCrit = Math.random() * 100 < 5;
  const critMult = isCrit ? 1.5 : 1;
  const baseDamage = Math.max(1, atk - def * 0.5);
  const variance = 0.9 + Math.random() * 0.2;
  const damage = Math.floor(baseDamage * elementMult * critMult * variance);
  return { damage, isCrit };
}

export function simulateBattle(
  playerUnits: Student[],
  enemies: Enemy[]
): { victory: boolean; battleLog: BattleLogEntry[]; survivors: string[]; expGained: number } {
  const battleLog: BattleLogEntry[] = [];
  let turn = 1;
  const playerBattleUnits: BattleUnit[] = playerUnits.map((s) => ({
    id: s.id,
    name: s.name,
    isPlayer: true,
    hp: s.stats.hp,
    maxHp: s.stats.maxHp,
    attack: s.stats.attack,
    defense: s.stats.defense,
    magic: s.stats.magic,
    speed: s.stats.speed,
    element: s.element,
    icon: s.avatar,
    alive: true,
  }));
  const enemyBattleUnits: BattleUnit[] = enemies.map((e) => ({ ...e, isPlayer: false, alive: true }));
  const maxTurns = 50;
  while (turn <= maxTurns) {
    const allUnits = [...playerBattleUnits, ...enemyBattleUnits]
      .filter((u) => u.alive)
      .sort((a, b) => b.speed - a.speed);
    for (const unit of allUnits) {
      if (!unit.alive) continue;
      const enemiesArr = unit.isPlayer ? enemyBattleUnits : playerBattleUnits;
      const aliveEnemies = enemiesArr.filter((e) => e.alive);
      if (aliveEnemies.length === 0) break;
      const target = aliveEnemies.reduce((lowest, e) => (e.hp < lowest.hp ? e : lowest), aliveEnemies[0]);
      const useMagic = unit.magic > unit.attack * 1.2;
      const { damage, isCrit } = calculateDamage(unit, target, useMagic);
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp === 0) target.alive = false;
      const attackType = useMagic ? '魔法攻击' : '物理攻击';
      const critText = isCrit ? '【暴击】' : '';
      battleLog.push({
        turn,
        attacker: unit.name,
        target: target.name,
        damage,
        isCrit,
        isHeal: false,
        message: `${turn}回合: ${unit.name} 使用${attackType}${critText} 对 ${target.name} 造成 ${damage} 点伤害${target.alive ? '' : '，目标被击败！'}`,
      });
      const allPlayersDead = playerBattleUnits.every((u) => !u.alive);
      const allEnemiesDead = enemyBattleUnits.every((u) => !u.alive);
      if (allPlayersDead || allEnemiesDead) break;
    }
    const allPlayersDead = playerBattleUnits.every((u) => !u.alive);
    const allEnemiesDead = enemyBattleUnits.every((u) => !u.alive);
    if (allPlayersDead || allEnemiesDead) break;
    turn++;
  }
  const victory = enemyBattleUnits.every((u) => !u.alive);
  const survivors = playerBattleUnits.filter((u) => u.alive).map((u) => u.id);
  const totalEnemyStrength = enemies.reduce((sum, e) => sum + e.maxHp + e.attack * 5, 0);
  const survivalBonus = survivors.length / playerBattleUnits.length;
  const expGained = Math.floor(totalEnemyStrength * survivalBonus * 0.5);
  return { victory, battleLog, survivors, expGained };
}

export function calculateUpgradeCost(baseCost: number, level: number, multiplier: number): number {
  return Math.floor(baseCost * Math.pow(multiplier, level));
}

export function getExpToNextLevel(level: number): number {
  return level * 100 + Math.pow(level, 2) * 20;
}

export function levelUpStudent(student: Student): Student {
  let exp = student.exp;
  let level = student.level;
  let expNeeded = getExpToNextLevel(level);
  while (exp >= expNeeded) {
    exp -= expNeeded;
    level++;
    expNeeded = getExpToNextLevel(level);
  }
  const levelDiff = level - student.level;
  if (levelDiff > 0) {
    const statGain: StudentStats = {
      hp: Math.floor(student.stats.maxHp * 0.1 * levelDiff),
      maxHp: Math.floor(student.stats.maxHp * 0.1 * levelDiff),
      attack: Math.floor(student.stats.attack * 0.08 * levelDiff),
      defense: Math.floor(student.stats.defense * 0.08 * levelDiff),
      magic: Math.floor(student.stats.magic * 0.08 * levelDiff),
      speed: Math.floor(student.stats.speed * 0.05 * levelDiff),
      critRate: Math.floor(student.stats.critRate * 0.05 * levelDiff),
      critDamage: Math.floor(student.stats.critDamage * 0.05 * levelDiff),
    };
    return {
      ...student,
      level,
      exp,
      stats: {
        hp: student.stats.hp + statGain.hp,
        maxHp: student.stats.maxHp + statGain.maxHp,
        attack: student.stats.attack + statGain.attack,
        defense: student.stats.defense + statGain.defense,
        magic: student.stats.magic + statGain.magic,
        speed: student.stats.speed + statGain.speed,
        critRate: student.stats.critRate + statGain.critRate,
        critDamage: student.stats.critDamage + statGain.critDamage,
      },
    };
  }
  return { ...student, exp };
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.floor(num).toString();
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function getFatigueLevel(fatigue: number, maxFatigue: number): FatigueLevel {
  const ratio = fatigue / maxFatigue;
  if (ratio < 0.3) return 'energetic';
  if (ratio < 0.6) return 'normal';
  if (ratio < 0.85) return 'tired';
  return 'exhausted';
}

export function getFatigueLevelName(level: FatigueLevel): string {
  const names: Record<FatigueLevel, string> = {
    energetic: '精力充沛',
    normal: '状态良好',
    tired: '疲劳',
    exhausted: '精疲力竭',
  };
  return names[level];
}

export function getFatigueLevelColor(level: FatigueLevel): string {
  const colors: Record<FatigueLevel, string> = {
    energetic: '#10B981',
    normal: '#3B82F6',
    tired: '#F59E0B',
    exhausted: '#EF4444',
  };
  return colors[level];
}

export function calculateMaxFatigue(level: number): number {
  return FATIGUE_CONFIG.BASE_MAX_FATIGUE + level * FATIGUE_CONFIG.LEVEL_BONUS;
}

export function calculateStudyFatigueCost(duration: number): number {
  return Math.floor(duration * FATIGUE_CONFIG.STUDY_COST_PER_MINUTE / 60);
}

export function calculateDungeonFatigueCost(difficulty: string): number {
  const difficultyCosts = FATIGUE_CONFIG.DUNGEON_COST_PER_DIFFICULTY as Record<string, number>;
  return FATIGUE_CONFIG.DUNGEON_COST_BASE + (difficultyCosts[difficulty] || 0);
}

export function calculateRestFatigueRecovery(duration: number, dormLevel: number = 1): number {
  const baseRecovery = duration * FATIGUE_CONFIG.REST_RECOVERY_PER_MINUTE;
  const dormBonus = 1 + dormLevel * 0.1;
  return Math.floor(baseRecovery * dormBonus);
}

export function getEfficiencyMultiplier(fatigue: number, maxFatigue: number, morale: number): number {
  const ratio = fatigue / maxFatigue;
  let multiplier = 1.0;
  
  if (ratio >= FATIGUE_CONFIG.EXHAUSTION_THRESHOLD / 100) {
    multiplier *= FATIGUE_CONFIG.EXHAUSTION_PENALTY_MULTIPLIER;
  } else if (ratio >= FATIGUE_CONFIG.FATIGUE_PENALTY_THRESHOLD / 100) {
    multiplier *= FATIGUE_CONFIG.FATIGUE_PENALTY_MULTIPLIER;
  }
  
  if (morale >= FATIGUE_CONFIG.MORALE_BONUS_THRESHOLD) {
    multiplier *= FATIGUE_CONFIG.MORALE_BONUS_MULTIPLIER;
  }
  
  return multiplier;
}

export function calculateDailyFatigueRecovery(dormLevel: number): number {
  return FATIGUE_CONFIG.DAILY_RECOVERY_BASE + dormLevel * FATIGUE_CONFIG.DORM_BONUS_PER_LEVEL;
}

export function hasSchedulingConflict(
  entries: ScheduleEntry[],
  studentId: string,
  startTime: number,
  duration: number
): boolean {
  const endTime = startTime + duration;
  return entries.some(
    (e) =>
      e.studentId === studentId &&
      !(e.startTime + e.duration <= startTime || e.startTime >= endTime)
  );
}

export function getStudentScheduleEntries(
  entries: ScheduleEntry[],
  studentId: string
): ScheduleEntry[] {
  return entries.filter((e) => e.studentId === studentId);
}

export function getActivityName(activity: ActivityType): string {
  const names: Record<ActivityType, string> = {
    study: '学习',
    train: '训练',
    dungeon: '试炼',
    rest: '休息',
    idle: '空闲',
  };
  return names[activity];
}

export function getActivityIcon(activity: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    study: '📖',
    train: '⚔️',
    dungeon: '🗺️',
    rest: '😴',
    idle: '💤',
  };
  return icons[activity];
}

export function formatGameTime(minutes: number): string {
  const m = minutes % TIME_CONFIG.MINUTES_PER_DAY;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function getTimeOfDay(minutes: number): TimeOfDay {
  const m = minutes % TIME_CONFIG.MINUTES_PER_DAY;
  if (m < 360) return 'dawn';
  if (m < 720) return 'morning';
  if (m < TIME_CONFIG.EVENING_START) return 'afternoon';
  if (m < TIME_CONFIG.NIGHT_START) return 'evening';
  return 'night';
}

export function getTimeOfDayName(timeOfDay: TimeOfDay): string {
  const names: Record<TimeOfDay, string> = {
    dawn: '黎明',
    morning: '上午',
    afternoon: '下午',
    evening: '傍晚',
    night: '夜晚',
  };
  return names[timeOfDay];
}

export function getTimeOfDayIcon(timeOfDay: TimeOfDay): string {
  const icons: Record<TimeOfDay, string> = {
    dawn: '🌅',
    morning: '☀️',
    afternoon: '🌤️',
    evening: '🌇',
    night: '🌙',
  };
  return icons[timeOfDay];
}

export function getScheduleEntriesAtTime(
  entries: ScheduleEntry[],
  currentTime: number
): ScheduleEntry[] {
  return entries.filter(
    (e) =>
      e.status !== 'completed' &&
      e.status !== 'skipped' &&
      e.startTime <= currentTime &&
      e.startTime + e.duration > currentTime
  );
}

export function getPendingScheduleEntries(
  entries: ScheduleEntry[],
  currentTime: number
): ScheduleEntry[] {
  return entries.filter(
    (e) =>
      (!e.status || e.status === 'pending') &&
      e.startTime <= currentTime &&
      e.startTime + e.duration > currentTime
  );
}

export function getExpiredScheduleEntries(
  entries: ScheduleEntry[],
  currentTime: number
): ScheduleEntry[] {
  return entries.filter(
    (e) =>
      (!e.status || e.status === 'pending') &&
      e.startTime + e.duration <= currentTime
  );
}

export function isStudentBusy(
  entries: ScheduleEntry[],
  studentId: string,
  currentTime: number
): boolean {
  return entries.some(
    (e) =>
      e.studentId === studentId &&
      e.status === 'active' &&
      e.startTime <= currentTime &&
      e.startTime + e.duration > currentTime
  );
}

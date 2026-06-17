import { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { GameState, Resources, Building, Student, Course, BuildingType, CourseType, ScheduleEntry, ActivityType, ScheduleStatus, PoolType, RecruitHistoryEntry, RecruitStats, PityCounter, Rarity, LimitedPoolEndTimes, Equipment, Potion, MaterialType, CraftingJob, Recipe, EquipmentSlot, DungeonDifficulty, StudentClass, PromotionQuest, ClassPromotion, CourseMastery, MasteryLevel, ClassDef, CourseDef } from '../types/game';
import { BUILDING_DEFS, INITIAL_RESOURCES, STUDENT_CAPACITY_BASE, STUDENT_CAPACITY_PER_LEVEL, COURSE_DEFS, FATIGUE_CONFIG, TIME_CONFIG, RECRUIT_POOL_DEFS, INITIAL_MATERIALS, EQUIPMENT_DEFS, POTION_DEFS, RECIPES, BASE_STUDENT_STATS, CLASS_DEFS, MASTERY_CONFIG } from '../data/gameData';
import { 
  levelUpStudent, generateId, getEfficiencyMultiplier, formatGameTime, createInitialPityCounters, 
  createInitialRecruitStats, updatePityCounter, calculateStudentStats, generateDungeonDrops, 
  addMasteryExp as utilsAddMasteryExp, generateStudentForPoolWithClass, promoteStudent as utilsPromoteStudent, 
  addClassExp as utilsAddClassExp, calculateTotalMasteryBonuses, calculateClassBonuses, 
  canPromoteToClass as utilsCanPromoteToClass, getStudentMastery as utilsGetStudentMastery, 
  masteryLevelMeetsRequirement, createStudentWithMasteryAndClass, getAvailablePromotions as utilsGetAvailablePromotions, 
  calculateMasterySettlementBonus as utilsCalculateMasterySettlementBonus, 
  calculateClassSettlementBonus as utilsCalculateClassSettlementBonus, 
  canAccessCourse as utilsCanAccessCourse, getMasteryLevelIndex 
} from '../utils/gameUtils';

type GameAction =
  | { type: 'ADD_RESOURCES'; resources: Partial<Resources> }
  | { type: 'SPEND_RESOURCES'; resources: Partial<Resources> }
  | { type: 'UPGRADE_BUILDING'; buildingType: BuildingType }
  | { type: 'ADD_STUDENT'; student: Student }
  | { type: 'REMOVE_STUDENT'; studentId: string }
  | { type: 'UPDATE_STUDENT'; student: Student }
  | { type: 'ADD_COURSE'; course: Course }
  | { type: 'REMOVE_COURSE'; courseId: string }
  | { type: 'UPDATE_COURSE'; course: Course }
  | { type: 'UPDATE_ALL_COURSES'; courses: Course[] }
  | { type: 'ADVANCE_TIME'; deltaTime: number }
  | { type: 'NEW_DAY' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<GameState['settings']> }
  | { type: 'INCREMENT_DUNGEON_RUNS'; victory: boolean }
  | { type: 'LOAD_STATE'; state: GameState }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_ACADEMY_EXP'; exp: number }
  | { type: 'SAVE_NOW' }
  | { type: 'UPDATE_FATIGUE'; studentId: string; delta: number }
  | { type: 'ADD_SCHEDULE_ENTRY'; entry: ScheduleEntry }
  | { type: 'REMOVE_SCHEDULE_ENTRY'; entryId: string }
  | { type: 'CLEAR_SCHEDULE' }
  | { type: 'REST_STUDENT'; studentId: string; duration: number }
  | { type: 'TICK_TIME' }
  | { type: 'SET_SCHEDULE_AUTO_EXECUTE'; value: boolean }
  | { type: 'UPDATE_SCHEDULE_ENTRY_STATUS'; entryId: string; status: ScheduleStatus; result?: string }
  | { type: 'ADVANCE_MINUTES'; minutes: number }
  | { type: 'ADD_RECRUIT_HISTORY'; entry: RecruitHistoryEntry }
  | { type: 'UPDATE_RECRUIT_STATS'; stats: Partial<RecruitStats> }
  | { type: 'UPDATE_PITY_COUNTER'; poolId: PoolType; counter: PityCounter }
  | { type: 'BATCH_RECRUIT_UPDATE'; historyEntries: RecruitHistoryEntry[]; statsUpdate: Partial<RecruitStats>; pityUpdates: PityCounter[] }
  | { type: 'SET_LIMITED_POOL_END_TIME'; poolId: PoolType; endTime: number | undefined }
  | { type: 'ADD_EQUIPMENT'; equipment: Equipment }
  | { type: 'REMOVE_EQUIPMENT'; equipmentId: string }
  | { type: 'EQUIP_ITEM'; studentId: string; equipmentId: string; slot: EquipmentSlot }
  | { type: 'UNEQUIP_ITEM'; studentId: string; slot: EquipmentSlot }
  | { type: 'ADD_POTION'; potion: Potion }
  | { type: 'USE_POTION'; potionId: string; studentId: string; quantity: number }
  | { type: 'ADD_MATERIALS'; materials: Partial<Record<MaterialType, number>> }
  | { type: 'SPEND_MATERIALS'; materials: Partial<Record<MaterialType, number>> }
  | { type: 'START_CRAFTING'; job: CraftingJob }
  | { type: 'COMPLETE_CRAFTING'; jobId: string }
  | { type: 'CLAIM_CRAFTING'; jobId: string }
  | { type: 'UPDATE_CRAFTING_JOBS' }
  | { type: 'EXPIRE_POTIONS' }
  | { type: 'ADD_MULTIPLE_EQUIPMENT'; equipment: Equipment[] }
  | { type: 'ADD_MULTIPLE_POTIONS'; potions: Potion[] }
  | { type: 'ADD_MASTERY_EXP'; studentId: string; courseType: CourseType; exp: number }
  | { type: 'PROMOTE_STUDENT'; studentId: string; targetClass: StudentClass }
  | { type: 'ADD_CLASS_EXP'; studentId: string; exp: number }
  | { type: 'START_PROMOTION_QUEST'; quest: PromotionQuest }
  | { type: 'COMPLETE_PROMOTION_QUEST'; questId: string; studentId: string; targetClass: StudentClass }
  | { type: 'UPDATE_PROMOTION_QUEST'; questId: string; stepId: string; current: number }
  | { type: 'UPDATE_STUDENT_MASTERY'; studentId: string; mastery: CourseMastery }
  | { type: 'CHECK_PROMOTION_AVAILABILITY'; studentId: string };

const STORAGE_KEY = 'magic_academy_save';

function createInitialLimitedPoolEndTimes(): LimitedPoolEndTimes {
  const endTimes: LimitedPoolEndTimes = {};
  const pools = Object.values(RECRUIT_POOL_DEFS).filter(p => p.isLimited && p.defaultDurationMs);
  for (const pool of pools) {
    endTimes[pool.id as keyof LimitedPoolEndTimes] = Date.now() + (pool.defaultDurationMs || 0);
  }
  return endTimes;
}

function getInitialBuildings(): Building[] {
  return [
    { type: 'main_hall', level: 1, x: 400, y: 250, constructed: true },
    { type: 'dormitory', level: 1, x: 200, y: 200, constructed: true },
    { type: 'classroom', level: 1, x: 600, y: 200, constructed: true },
    { type: 'library', level: 0, x: 150, y: 380, constructed: false },
    { type: 'training_ground', level: 0, x: 650, y: 380, constructed: false },
    { type: 'alchemy_lab', level: 0, x: 300, y: 450, constructed: false },
    { type: 'magic_tower', level: 0, x: 500, y: 450, constructed: false },
    { type: 'warehouse', level: 0, x: 400, y: 120, constructed: false },
  ];
}

function createInitialState(): GameState {
  return {
    resources: { ...INITIAL_RESOURCES },
    buildings: getInitialBuildings(),
    students: [],
    courses: [],
    day: 1,
    time: 0,
    academyName: '星辰魔法学院',
    academyLevel: 1,
    academyExp: 0,
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      notificationsEnabled: true,
      autoSave: true,
      language: 'zh-CN',
      animationSpeed: 1,
    },
    lastSaveTime: Date.now(),
    dungeonRuns: 0,
    totalVictories: 0,
    achievements: [],
    schedule: {
      day: 1,
      entries: [],
      autoExecute: true,
    },
    recruitHistory: [],
    recruitStats: createInitialRecruitStats(),
    pityCounters: createInitialPityCounters(),
    limitedPoolEndTimes: createInitialLimitedPoolEndTimes(),
    equipment: [],
    potions: [],
    materials: { ...INITIAL_MATERIALS },
    craftingJobs: [],
    promotionQuests: [],
    totalPromotions: 0,
    totalMasteryGrandmasters: 0,
  };
}

function getBuildingCost(buildingType: BuildingType, currentLevel: number): Resources {
  const def = BUILDING_DEFS[buildingType];
  const multiplier = Math.pow(def.costMultiplier, currentLevel);
  return {
    gold: Math.floor(def.baseCost.gold * multiplier),
    mana: Math.floor(def.baseCost.mana * multiplier),
    exp: 0,
    crystals: Math.floor(def.baseCost.crystals * multiplier),
    materials: Math.floor(def.baseCost.materials * multiplier),
  };
}

function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  return (
    resources.gold >= (cost.gold || 0) &&
    resources.mana >= (cost.mana || 0) &&
    resources.crystals >= (cost.crystals || 0) &&
    resources.materials >= (cost.materials || 0)
  );
}

function subtractResources(resources: Resources, cost: Partial<Resources>): Resources {
  return {
    gold: resources.gold - (cost.gold || 0),
    mana: resources.mana - (cost.mana || 0),
    exp: resources.exp,
    crystals: resources.crystals - (cost.crystals || 0),
    materials: resources.materials - (cost.materials || 0),
  };
}

function addResources(resources: Resources, amount: Partial<Resources>): Resources {
  return {
    gold: resources.gold + (amount.gold || 0),
    mana: resources.mana + (amount.mana || 0),
    exp: resources.exp + (amount.exp || 0),
    crystals: resources.crystals + (amount.crystals || 0),
    materials: resources.materials + (amount.materials || 0),
  };
}

function getStudentCapacity(buildings: Building[]): number {
  const dorm = buildings.find((b) => b.type === 'dormitory');
  const dormLevel = dorm?.level || 0;
  return STUDENT_CAPACITY_BASE + dormLevel * STUDENT_CAPACITY_PER_LEVEL;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ADD_RESOURCES': {
      const newResources = addResources(state.resources, action.resources);
      return { ...state, resources: newResources };
    }

    case 'SPEND_RESOURCES': {
      if (!canAfford(state.resources, action.resources)) return state;
      const newResources = subtractResources(state.resources, action.resources);
      return { ...state, resources: newResources };
    }

    case 'UPGRADE_BUILDING': {
      const building = state.buildings.find((b) => b.type === action.buildingType);
      if (!building) return state;
      const def = BUILDING_DEFS[action.buildingType];
      if (building.level >= def.maxLevel) return state;
      const cost = getBuildingCost(action.buildingType, building.level);
      if (!canAfford(state.resources, cost)) return state;
      const mainHall = state.buildings.find((b) => b.type === 'main_hall');
      if (action.buildingType !== 'main_hall' && building.level >= (mainHall?.level || 1)) {
        return state;
      }
      const newBuildings = state.buildings.map((b) =>
        b.type === action.buildingType
          ? { ...b, level: b.level + 1, constructed: true }
          : b
      );
      const newResources = subtractResources(state.resources, cost);
      return { ...state, buildings: newBuildings, resources: newResources };
    }

    case 'ADD_STUDENT': {
      const capacity = getStudentCapacity(state.buildings);
      if (state.students.length >= capacity) return state;
      return { ...state, students: [...state.students, action.student] };
    }

    case 'REMOVE_STUDENT': {
      return {
        ...state,
        students: state.students.filter((s) => s.id !== action.studentId),
      };
    }

    case 'UPDATE_STUDENT': {
      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.student.id ? action.student : s
        ),
      };
    }

    case 'ADD_COURSE': {
      return { ...state, courses: [...state.courses, action.course] };
    }

    case 'REMOVE_COURSE': {
      return {
        ...state,
        courses: state.courses.filter((c) => c.id !== action.courseId),
      };
    }

    case 'UPDATE_COURSE': {
      return {
        ...state,
        courses: state.courses.map((c) =>
          c.id === action.course.id ? action.course : c
        ),
      };
    }

    case 'UPDATE_ALL_COURSES': {
      return { ...state, courses: action.courses };
    }

    case 'ADVANCE_TIME': {
      return { ...state, time: state.time + action.deltaTime };
    }

    case 'NEW_DAY': {
      return { ...state, day: state.day + 1, time: 0 };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: { ...state.settings, ...action.settings },
      };
    }

    case 'INCREMENT_DUNGEON_RUNS': {
      return {
        ...state,
        dungeonRuns: state.dungeonRuns + 1,
        totalVictories: action.victory ? state.totalVictories + 1 : state.totalVictories,
      };
    }

    case 'UPDATE_ACADEMY_EXP': {
      const newExp = state.academyExp + action.exp;
      const expNeeded = state.academyLevel * 500;
      if (newExp >= expNeeded) {
        return {
          ...state,
          academyExp: newExp - expNeeded,
          academyLevel: state.academyLevel + 1,
        };
      }
      return { ...state, academyExp: newExp };
    }

    case 'LOAD_STATE': {
      return action.state;
    }

    case 'RESET_GAME': {
      return createInitialState();
    }

    case 'SAVE_NOW': {
      return { ...state, lastSaveTime: Date.now() };
    }

    case 'UPDATE_FATIGUE': {
      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.studentId
            ? { ...s, fatigue: Math.max(0, Math.min(s.maxFatigue, s.fatigue + action.delta)) }
            : s
        ),
      };
    }

    case 'ADD_SCHEDULE_ENTRY': {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          entries: [...state.schedule.entries, action.entry],
        },
      };
    }

    case 'REMOVE_SCHEDULE_ENTRY': {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          entries: state.schedule.entries.filter((e) => e.id !== action.entryId),
        },
      };
    }

    case 'CLEAR_SCHEDULE': {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          entries: [],
        },
      };
    }

    case 'REST_STUDENT': {
      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.studentId
            ? {
                ...s,
                status: 'resting',
                fatigue: Math.max(0, s.fatigue - Math.floor(FATIGUE_CONFIG.REST_RECOVERY_PER_MINUTE * action.duration)),
              }
            : s
        ),
      };
    }

    case 'TICK_TIME': {
      const minutesPerTick = TIME_CONFIG.MINUTES_PER_TICK;
      let newTime = state.time + minutesPerTick;
      let newDay = state.day;
      
      if (newTime >= TIME_CONFIG.MINUTES_PER_DAY) {
        newTime = newTime % TIME_CONFIG.MINUTES_PER_DAY;
        newDay += 1;
      }

      return {
        ...state,
        time: newTime,
        day: newDay,
      };
    }

    case 'ADVANCE_MINUTES': {
      let newTime = state.time + action.minutes;
      let newDay = state.day;
      
      if (newTime >= TIME_CONFIG.MINUTES_PER_DAY) {
        newDay += Math.floor(newTime / TIME_CONFIG.MINUTES_PER_DAY);
        newTime = newTime % TIME_CONFIG.MINUTES_PER_DAY;
      }

      return {
        ...state,
        time: newTime,
        day: newDay,
      };
    }

    case 'SET_SCHEDULE_AUTO_EXECUTE': {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          autoExecute: action.value,
        },
      };
    }

    case 'UPDATE_SCHEDULE_ENTRY_STATUS': {
      return {
        ...state,
        schedule: {
          ...state.schedule,
          entries: state.schedule.entries.map((e) =>
            e.id === action.entryId
              ? { ...e, status: action.status, result: action.result, executedAt: state.time }
              : e
          ),
        },
      };
    }

    case 'NEW_DAY': {
      const dorm = state.buildings.find((b) => b.type === 'dormitory');
      const dormLevel = dorm?.level || 0;
      const fatigueRecovery = FATIGUE_CONFIG.DAILY_RECOVERY_BASE + dormLevel * FATIGUE_CONFIG.DORM_BONUS_PER_LEVEL;

      const updatedStudents = state.students.map((s) => {
        let newFatigue = Math.max(0, s.fatigue - fatigueRecovery);
        let newMorale = Math.min(100, s.morale + 10);
        let newStatus: Student['status'] = 'idle';
        let newHp = Math.min(s.stats.maxHp, s.stats.hp + Math.floor(s.stats.maxHp * 0.3));
        return {
          ...s,
          fatigue: newFatigue,
          morale: newMorale,
          status: newStatus,
          stats: { ...s.stats, hp: newHp },
          currentCourseId: undefined,
          studyProgress: 0,
        };
      });

      const scheduledEntries = state.schedule.entries
        .filter((e) => e.status !== 'completed')
        .map((e) => ({ ...e, status: 'pending' as ScheduleStatus, executedAt: undefined }));

      return {
        ...state,
        day: state.day + 1,
        time: 0,
        students: updatedStudents,
        schedule: {
          ...state.schedule,
          day: state.day + 1,
          entries: scheduledEntries,
        },
      };
    }

    case 'ADD_RECRUIT_HISTORY': {
      return {
        ...state,
        recruitHistory: [action.entry, ...state.recruitHistory].slice(0, 200),
      };
    }

    case 'UPDATE_RECRUIT_STATS': {
      return {
        ...state,
        recruitStats: { ...state.recruitStats, ...action.stats },
      };
    }

    case 'UPDATE_PITY_COUNTER': {
      return {
        ...state,
        pityCounters: state.pityCounters.map((c) =>
          c.poolId === action.poolId ? action.counter : c
        ),
      };
    }

    case 'BATCH_RECRUIT_UPDATE': {
      return {
        ...state,
        recruitHistory: [...action.historyEntries, ...state.recruitHistory].slice(0, 200),
        recruitStats: { ...state.recruitStats, ...action.statsUpdate },
        pityCounters: action.pityUpdates,
      };
    }

    case 'SET_LIMITED_POOL_END_TIME': {
      return {
        ...state,
        limitedPoolEndTimes: {
          ...state.limitedPoolEndTimes,
          [action.poolId]: action.endTime,
        },
      };
    }

    case 'ADD_EQUIPMENT': {
      return {
        ...state,
        equipment: [...state.equipment, action.equipment],
      };
    }

    case 'ADD_MULTIPLE_EQUIPMENT': {
      return {
        ...state,
        equipment: [...state.equipment, ...action.equipment],
      };
    }

    case 'REMOVE_EQUIPMENT': {
      return {
        ...state,
        equipment: state.equipment.filter((e) => e.id !== action.equipmentId),
      };
    }

    case 'EQUIP_ITEM': {
      const equipment = state.equipment.find((e) => e.id === action.equipmentId);
      if (!equipment) return state;

      const student = state.students.find((s) => s.id === action.studentId);
      if (!student) return state;

      const oldEquipmentId = student.equipment[action.slot];

      const updatedEquipment = state.equipment.map((e) => {
        if (e.id === action.equipmentId) {
          return { ...e, isEquipped: true, equippedBy: action.studentId };
        }
        if (e.id === oldEquipmentId) {
          return { ...e, isEquipped: false, equippedBy: undefined };
        }
        return e;
      });

      const updatedStudents = state.students.map((s) => {
        if (s.id === action.studentId) {
          const newEquipment = { ...s.equipment, [action.slot]: action.equipmentId };
          const updatedStudent = { ...s, equipment: newEquipment };
          const newStats = calculateStudentStats(updatedStudent, updatedEquipment, state.potions);
          return { ...updatedStudent, stats: newStats };
        }
        return s;
      });

      return {
        ...state,
        equipment: updatedEquipment,
        students: updatedStudents,
      };
    }

    case 'UNEQUIP_ITEM': {
      const student = state.students.find((s) => s.id === action.studentId);
      if (!student) return state;

      const equipmentId = student.equipment[action.slot];
      if (!equipmentId) return state;

      const updatedEquipment = state.equipment.map((e) =>
        e.id === equipmentId ? { ...e, isEquipped: false, equippedBy: undefined } : e
      );

      const updatedStudents = state.students.map((s) => {
        if (s.id === action.studentId) {
          const newEquipment = { ...s.equipment, [action.slot]: null };
          const updatedStudent = { ...s, equipment: newEquipment };
          const newStats = calculateStudentStats(updatedStudent, updatedEquipment, state.potions);
          return { ...updatedStudent, stats: newStats };
        }
        return s;
      });

      return {
        ...state,
        equipment: updatedEquipment,
        students: updatedStudents,
      };
    }

    case 'ADD_POTION': {
      const existingPotion = state.potions.find((p) => p.defId === action.potion.defId && !p.isUsed);
      if (existingPotion) {
        return {
          ...state,
          potions: state.potions.map((p) =>
            p.id === existingPotion.id ? { ...p, quantity: p.quantity + action.potion.quantity } : p
          ),
        };
      }
      return {
        ...state,
        potions: [...state.potions, action.potion],
      };
    }

    case 'ADD_MULTIPLE_POTIONS': {
      let updatedPotions = [...state.potions];
      for (const potion of action.potions) {
        const existing = updatedPotions.find((p) => p.defId === potion.defId && !p.isUsed);
        if (existing) {
          updatedPotions = updatedPotions.map((p) =>
            p.id === existing.id ? { ...p, quantity: p.quantity + potion.quantity } : p
          );
        } else {
          updatedPotions.push(potion);
        }
      }
      return {
        ...state,
        potions: updatedPotions,
      };
    }

    case 'USE_POTION': {
      const potion = state.potions.find((p) => p.id === action.potionId);
      if (!potion || potion.quantity < action.quantity || potion.isUsed) return state;

      const student = state.students.find((s) => s.id === action.studentId);
      if (!student) return state;

      const potionDef = POTION_DEFS[potion.defId];
      if (!potionDef) return state;

      let updatedStudent = { ...student };
      const newQuantity = potion.quantity - action.quantity;

      const isBuffType = !['hp', 'fatigue', 'morale'].includes(potionDef.type);
      const usedPotionIds: string[] = [];

      if (potionDef.type === 'hp') {
        const healAmount = (potionDef.effect.value || 0) * action.quantity;
        const newHp = Math.min(updatedStudent.stats.maxHp, updatedStudent.stats.hp + healAmount);
        updatedStudent.stats = { ...updatedStudent.stats, hp: newHp };
      } else if (potionDef.type === 'fatigue') {
        const recoverAmount = (potionDef.effect.value || 0) * action.quantity;
        updatedStudent.fatigue = Math.max(0, updatedStudent.fatigue - recoverAmount);
      } else if (potionDef.type === 'morale') {
        const boostAmount = (potionDef.effect.value || 0) * action.quantity;
        updatedStudent.morale = Math.min(100, updatedStudent.morale + boostAmount);
      }

      const usedPotions: Potion[] = [];
      const now = Date.now();
      for (let i = 0; i < action.quantity; i++) {
        const usedPotionId = `${potion.id}_used_${now}_${i}`;
        usedPotionIds.push(usedPotionId);
        usedPotions.push({
          id: usedPotionId,
          defId: potion.defId,
          isUsed: true,
          usedBy: action.studentId,
          usedAt: now,
          endTime: isBuffType ? now + (potionDef.duration || 0) : now,
          quantity: 1,
        });
      }

      if (isBuffType) {
        updatedStudent.activePotions = [...updatedStudent.activePotions, ...usedPotionIds];
      }

      const updatedPotions = state.potions.flatMap((p) => {
        if (p.id !== action.potionId) return [p];
        const result: Potion[] = [];
        if (newQuantity > 0) {
          result.push({ ...p, quantity: newQuantity });
        }
        result.push(...usedPotions);
        return result;
      });

      const updatedStudents = state.students.map((s) =>
        s.id === action.studentId ? updatedStudent : s
      );

      const recalculatedStudents = updatedStudents.map((s) => ({
        ...s,
        stats: calculateStudentStats(s, state.equipment, updatedPotions),
      }));

      return {
        ...state,
        potions: updatedPotions,
        students: recalculatedStudents,
      };
    }

    case 'ADD_MATERIALS': {
      const newMaterials = { ...state.materials };
      for (const [type, amount] of Object.entries(action.materials)) {
        if (amount !== undefined) {
          newMaterials[type as MaterialType] = (newMaterials[type as MaterialType] || 0) + amount;
        }
      }
      return {
        ...state,
        materials: newMaterials,
      };
    }

    case 'SPEND_MATERIALS': {
      const newMaterials = { ...state.materials };
      for (const [type, amount] of Object.entries(action.materials)) {
        if (amount !== undefined) {
          newMaterials[type as MaterialType] = Math.max(0, (newMaterials[type as MaterialType] || 0) - amount);
        }
      }
      return {
        ...state,
        materials: newMaterials,
      };
    }

    case 'START_CRAFTING': {
      return {
        ...state,
        craftingJobs: [...state.craftingJobs, action.job],
      };
    }

    case 'COMPLETE_CRAFTING': {
      return {
        ...state,
        craftingJobs: state.craftingJobs.map((j) =>
          j.id === action.jobId ? { ...j, completed: true } : j
        ),
      };
    }

    case 'CLAIM_CRAFTING': {
      return {
        ...state,
        craftingJobs: state.craftingJobs.map((j) =>
          j.id === action.jobId ? { ...j, claimed: true } : j
        ),
      };
    }

    case 'UPDATE_CRAFTING_JOBS': {
      const now = Date.now();
      const updatedJobs = state.craftingJobs.map((j) => {
        if (!j.completed && now >= j.endTime) {
          return { ...j, completed: true };
        }
        return j;
      });
      return {
        ...state,
        craftingJobs: updatedJobs,
      };
    }

    case 'EXPIRE_POTIONS': {
      const now = Date.now();
      const expiredPotionIds = new Set<string>();

      const remainingPotions = state.potions.filter((p) => {
        if (p.isUsed && p.endTime && now >= p.endTime) {
          expiredPotionIds.add(p.id);
          return false;
        }
        return true;
      });

      if (expiredPotionIds.size === 0) {
        return state;
      }

      let hasExpiredForStudent = false;
      const updatedStudents = state.students.map((s) => {
        const hasExpired = s.activePotions.some((id) => expiredPotionIds.has(id));
        if (!hasExpired) return s;
        hasExpiredForStudent = true;
        return {
          ...s,
          activePotions: s.activePotions.filter((id) => !expiredPotionIds.has(id)),
        };
      });

      if (!hasExpiredForStudent) {
        return {
          ...state,
          potions: remainingPotions,
        };
      }

      const recalculatedStudents = updatedStudents.map((s) => ({
        ...s,
        stats: calculateStudentStats(s, state.equipment, remainingPotions),
      }));

      return {
        ...state,
        potions: remainingPotions,
        students: recalculatedStudents,
      };
    }

    case 'ADD_MASTERY_EXP': {
      const student = state.students.find((s) => s.id === action.studentId);
      if (!student) return state;

      const { student: updatedStudent, leveledUp, newLevel } = utilsAddMasteryExp(
        student,
        action.courseType,
        action.exp
      );

      const newStats = calculateStudentStats(updatedStudent, state.equipment, state.potions);
      const finalStudent = { ...updatedStudent, stats: newStats };

      let grandmasterCount = state.totalMasteryGrandmasters;
      if (leveledUp && newLevel === 'grandmaster') {
        grandmasterCount += 1;
      }

      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.studentId ? finalStudent : s
        ),
        totalMasteryGrandmasters: grandmasterCount,
      };
    }

    case 'PROMOTE_STUDENT': {
      const student = state.students.find((s) => s.id === action.studentId);
      if (!student) return state;

      const { canPromote } = utilsCanPromoteToClass(student, action.targetClass);
      if (!canPromote) return state;

      const targetClassDef = CLASS_DEFS[action.targetClass];
      if (!targetClassDef) return state;

      if (
        state.resources.gold < targetClassDef.goldCost ||
        state.resources.crystals < targetClassDef.crystalsCost
      ) {
        return state;
      }

      const updatedStudent = utilsPromoteStudent(student, action.targetClass);
      const newStats = calculateStudentStats(updatedStudent, state.equipment, state.potions);
      const finalStudent = { ...updatedStudent, stats: newStats };

      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.studentId ? finalStudent : s
        ),
        resources: {
          ...state.resources,
          gold: state.resources.gold - targetClassDef.goldCost,
          crystals: state.resources.crystals - targetClassDef.crystalsCost,
        },
        totalPromotions: state.totalPromotions + 1,
        promotionQuests: state.promotionQuests.filter(
          (q) => q.studentId !== action.studentId
        ),
      };
    }

    case 'ADD_CLASS_EXP': {
      const student = state.students.find((s) => s.id === action.studentId);
      if (!student) return state;

      const updatedStudent = utilsAddClassExp(student, action.exp);
      const newStats = calculateStudentStats(updatedStudent, state.equipment, state.potions);
      const finalStudent = { ...updatedStudent, stats: newStats };

      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.studentId ? finalStudent : s
        ),
      };
    }

    case 'START_PROMOTION_QUEST': {
      const existingQuest = state.promotionQuests.find(
        (q) => q.studentId === action.quest.studentId
      );
      if (existingQuest) return state;

      return {
        ...state,
        promotionQuests: [...state.promotionQuests, action.quest],
        students: state.students.map((s) =>
          s.id === action.quest.studentId
            ? { ...s, status: 'promoting', currentPromotionTarget: action.quest.targetClass }
            : s
        ),
      };
    }

    case 'UPDATE_PROMOTION_QUEST': {
      return {
        ...state,
        promotionQuests: state.promotionQuests.map((q) =>
          q.id === action.questId
            ? {
                ...q,
                steps: q.steps.map((s) =>
                  s.id === action.stepId
                    ? {
                        ...s,
                        current: Math.min(s.target, action.current),
                        completed: action.current >= s.target,
                      }
                    : s
                ),
              }
            : q
        ),
      };
    }

    case 'COMPLETE_PROMOTION_QUEST': {
      const quest = state.promotionQuests.find((q) => q.id === action.questId);
      if (!quest) return state;

      const student = state.students.find((s) => s.id === action.studentId);
      if (!student) return state;

      const targetClassDef = CLASS_DEFS[action.targetClass];
      if (!targetClassDef) return state;

      if (
        state.resources.gold < targetClassDef.goldCost ||
        state.resources.crystals < targetClassDef.crystalsCost
      ) {
        return state;
      }

      const updatedStudent = utilsPromoteStudent(student, action.targetClass);
      const newStats = calculateStudentStats(updatedStudent, state.equipment, state.potions);
      const finalStudent = { ...updatedStudent, stats: newStats };

      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.studentId ? finalStudent : s
        ),
        resources: {
          ...state.resources,
          gold: state.resources.gold - targetClassDef.goldCost,
          crystals: state.resources.crystals - targetClassDef.crystalsCost,
        },
        totalPromotions: state.totalPromotions + 1,
        promotionQuests: state.promotionQuests.map((q) =>
          q.id === action.questId ? { ...q, completedAt: Date.now() } : q
        ),
      };
    }

    case 'UPDATE_STUDENT_MASTERY': {
      return {
        ...state,
        students: state.students.map((s) => {
          if (s.id !== action.studentId) return s;
          const otherMasteries = s.masteries.filter(
            (m) => m.courseType !== action.mastery.courseType
          );
          return {
            ...s,
            masteries: [...otherMasteries, action.mastery],
          };
        }),
      };
    }

    case 'CHECK_PROMOTION_AVAILABILITY': {
      return {
        ...state,
        students: state.students.map((s) => {
          if (s.id !== action.studentId) return s;
          const availablePromotions = utilsGetAvailablePromotions(s);
          const canPromote = availablePromotions.some(
            (classDef) => utilsCanPromoteToClass(s, classDef.id).canPromote
          );
          return { ...s, availableForPromotion: canPromote };
        }),
      };
    }

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  getBuildingCost: (type: BuildingType, level: number) => Resources;
  canAfford: (cost: Partial<Resources>) => boolean;
  getStudentCapacity: () => number;
  saveGame: () => void;
  loadGame: () => boolean;
  getFatigueLevel: (fatigue: number, maxFatigue: number) => 'energetic' | 'normal' | 'tired' | 'exhausted';
  getEfficiencyMultiplier: (fatigue: number, maxFatigue: number, morale: number) => number;
  updateStudentFatigue: (studentId: string, delta: number) => void;
  addScheduleEntry: (entry: Omit<ScheduleEntry, 'id' | 'status'>) => void;
  removeScheduleEntry: (entryId: string) => void;
  clearSchedule: () => void;
  restStudent: (studentId: string, duration: number) => void;
  migrateSaveData: (savedState: any) => GameState;
  advanceMinutes: (minutes: number) => void;
  toggleAutoExecute: (value: boolean) => void;
  triggerNewDay: () => void;
  executeScheduledActivities: () => string[];
  addRecruitHistory: (entries: RecruitHistoryEntry[]) => void;
  updateRecruitStats: (update: Partial<RecruitStats>) => void;
  updatePityCounters: (counters: PityCounter[]) => void;
  batchRecruitUpdate: (historyEntries: RecruitHistoryEntry[], statsUpdate: Partial<RecruitStats>, pityUpdates: PityCounter[]) => void;
  getPoolEndTime: (poolId: PoolType) => number | undefined;
  resetLimitedPool: (poolId: PoolType) => void;
  canAffordMaterials: (materials: Partial<Record<MaterialType, number>>) => boolean;
  equipItem: (studentId: string, equipmentId: string, slot: EquipmentSlot) => void;
  unequipItem: (studentId: string, slot: EquipmentSlot) => void;
  usePotion: (potionId: string, studentId: string, quantity?: number) => void;
  startCrafting: (recipe: Recipe) => void;
  claimCrafting: (jobId: string) => void;
  getAlchemyLevel: () => number;
  addEquipment: (equipment: Equipment) => void;
  addPotion: (potion: Potion) => void;
  addMaterials: (materials: Partial<Record<MaterialType, number>>) => void;
  addMasteryExp: (studentId: string, courseType: CourseType, exp: number) => void;
  promoteStudent: (studentId: string, targetClass: StudentClass) => void;
  addClassExp: (studentId: string, exp: number) => void;
  canPromoteToClass: (studentId: string, targetClass: StudentClass) => { canPromote: boolean; reasons: string[] };
  getAvailablePromotions: (studentId: string) => ClassDef[];
  getStudentMastery: (studentId: string, courseType: CourseType) => CourseMastery;
  checkPromotionAvailability: (studentId: string) => void;
  calculateMasterySettlementBonus: (student: Student) => { gold: number; exp: number; mana: number };
  calculateClassSettlementBonus: (student: Student) => { gold: number; exp: number; mana: number };
  canAccessCourse: (student: Student, courseDef: CourseDef) => { canAccess: boolean; reasons: string[] };
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const migrateSaveData = (savedState: any): GameState => {
    const initial = createInitialState();
    const migrated: GameState = {
      ...initial,
      ...savedState,
      students: (savedState.students || []).map((s: any) => ({
        ...s,
        fatigue: s.fatigue ?? 0,
        maxFatigue: s.maxFatigue ?? FATIGUE_CONFIG.BASE_MAX_FATIGUE + (s.level || 1) * FATIGUE_CONFIG.LEVEL_BONUS,
        baseStats: s.baseStats || s.stats || { ...BASE_STUDENT_STATS },
        equipment: s.equipment || { weapon: null, armor: null, accessory: null, relic: null },
        activePotions: s.activePotions || [],
        class: s.class || 'novice',
        classTier: s.classTier || 'basic',
        masteries: s.masteries || [],
        promotionHistory: s.promotionHistory || [],
        classExp: s.classExp || 0,
        classLevel: s.classLevel || 1,
        availableForPromotion: s.availableForPromotion || false,
        currentPromotionTarget: s.currentPromotionTarget || undefined,
      })),
      schedule: savedState.schedule || {
        day: savedState.day || 1,
        entries: [],
        autoExecute: true,
      },
      recruitHistory: savedState.recruitHistory || [],
      recruitStats: savedState.recruitStats || createInitialRecruitStats(),
      pityCounters: savedState.pityCounters || createInitialPityCounters(),
      limitedPoolEndTimes: savedState.limitedPoolEndTimes || createInitialLimitedPoolEndTimes(),
      equipment: savedState.equipment || [],
      potions: savedState.potions || [],
      materials: savedState.materials || { ...INITIAL_MATERIALS },
      craftingJobs: savedState.craftingJobs || [],
      promotionQuests: savedState.promotionQuests || [],
      totalPromotions: savedState.totalPromotions || 0,
      totalMasteryGrandmasters: savedState.totalMasteryGrandmasters || 0,
    };
    if (migrated.schedule.autoExecute === undefined) {
      migrated.schedule.autoExecute = true;
    }
    return migrated;
  };

  const [state, dispatch] = useReducer(gameReducer, null, () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return migrateSaveData(parsed);
      } catch {
        return createInitialState();
      }
    }
    return createInitialState();
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const completeCourse = (course: Course) => {
    const def = COURSE_DEFS[course.courseType];
    const currentState = stateRef.current;
    const library = currentState.buildings.find((b) => b.type === 'library');
    const expBonus = 1 + (library?.level || 0) * 0.1;

    const completedStudentIds: string[] = [];

    for (const studentId of course.studentIds) {
      const student = currentState.students.find((s) => s.id === studentId);
      if (!student) continue;

      const elementBonus =
        def.elementBonus && student.element === def.elementBonus ? 1.3 : 1;
      const rarityBonus = 1 + (['legendary', 'epic', 'rare'].indexOf(student.rarity) >= 0 ? 0.2 : 0);
      const efficiencyMult = getEfficiencyMultiplier(student.fatigue, student.maxFatigue, student.morale);
      const totalExp = Math.floor(def.baseExp * expBonus * elementBonus * rarityBonus * efficiencyMult);

      const boostedStats = { ...student.stats };
      for (const [stat, boost] of Object.entries(def.statBoosts)) {
        if (boostedStats[stat as keyof typeof boostedStats] !== undefined) {
          const newValue = boostedStats[stat as keyof typeof boostedStats] + Math.floor((boost as number) * elementBonus * efficiencyMult);
          (boostedStats as Record<string, number>)[stat] = newValue;
        }
      }
      boostedStats.hp = boostedStats.maxHp;

      const fatigueCost = Math.floor(def.duration * FATIGUE_CONFIG.STUDY_COST_PER_MINUTE / 60);

      let updatedStudent: Student = {
        ...student,
        stats: boostedStats,
        exp: student.exp + totalExp,
        status: 'idle' as const,
        currentCourseId: undefined,
        studyProgress: 0,
        morale: Math.max(0, student.morale - 5),
        fatigue: Math.min(student.maxFatigue, student.fatigue + fatigueCost),
      };
      updatedStudent = levelUpStudent(updatedStudent, currentState.equipment, currentState.potions);

      const masteryExp = Math.floor(def.masteryExpPerComplete * efficiencyMult);
      const { student: studentWithMastery, leveledUp, newLevel } = utilsAddMasteryExp(
        updatedStudent,
        course.courseType,
        masteryExp
      );

      const classExp = Math.floor(totalExp * 0.3);
      const studentWithClass = utilsAddClassExp(studentWithMastery, classExp);

      const finalStats = calculateStudentStats(studentWithClass, currentState.equipment, currentState.potions);
      const finalStudent = { ...studentWithClass, stats: finalStats };

      dispatch({ type: 'UPDATE_STUDENT', student: finalStudent });
      dispatch({ type: 'UPDATE_ACADEMY_EXP', exp: Math.floor(totalExp / 5) });

      if (leveledUp) {
        dispatch({ type: 'CHECK_PROMOTION_AVAILABILITY', studentId });
      }

      completedStudentIds.push(studentId);
    }

    dispatch({ type: 'REMOVE_COURSE', courseId: course.id });
    return completedStudentIds;
  };

  const getFatigueLevel = (fatigue: number, maxFatigue: number): 'energetic' | 'normal' | 'tired' | 'exhausted' => {
    const ratio = fatigue / maxFatigue;
    if (ratio < 0.3) return 'energetic';
    if (ratio < 0.6) return 'normal';
    if (ratio < 0.85) return 'tired';
    return 'exhausted';
  };

  const getEfficiencyMultiplier = (fatigue: number, maxFatigue: number, morale: number): number => {
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
  };

  const updateStudentFatigue = (studentId: string, delta: number) => {
    dispatch({ type: 'UPDATE_FATIGUE', studentId, delta });
  };

  const addScheduleEntry = (entry: Omit<ScheduleEntry, 'id'>) => {
    const newEntry: ScheduleEntry = {
      ...entry,
      id: generateId(),
    };
    dispatch({ type: 'ADD_SCHEDULE_ENTRY', entry: newEntry });
  };

  const removeScheduleEntry = (entryId: string) => {
    dispatch({ type: 'REMOVE_SCHEDULE_ENTRY', entryId });
  };

  const clearSchedule = () => {
    dispatch({ type: 'CLEAR_SCHEDULE' });
  };

  const restStudent = (studentId: string, duration: number) => {
    dispatch({ type: 'REST_STUDENT', studentId, duration });
  };

  const advanceMinutes = (minutes: number) => {
    dispatch({ type: 'ADVANCE_MINUTES', minutes });
  };

  const toggleAutoExecute = (value: boolean) => {
    dispatch({ type: 'SET_SCHEDULE_AUTO_EXECUTE', value });
  };

  const triggerNewDay = () => {
    dispatch({ type: 'NEW_DAY' });
  };

  const executeScheduleStudy = (entry: ScheduleEntry): string => {
    const currentState = stateRef.current;
    const student = currentState.students.find((s) => s.id === entry.studentId);
    if (!student) return '学员不存在';
    if (student.status === 'studying' || student.status === 'dungeon') return '学员忙碌中';

    const courseType = entry.courseType || 'basic_magic';
    const def = COURSE_DEFS[courseType];
    if (!def) return '课程不存在';

    const fatigueCost = Math.floor(def.duration * FATIGUE_CONFIG.STUDY_COST_PER_MINUTE / 60);
    if (student.fatigue + fatigueCost > student.maxFatigue) {
      return '疲劳度过高';
    }

    const newCourse: Course = {
      id: generateId(),
      courseType,
      studentIds: [student.id],
      progress: 0,
      duration: def.duration,
      startTime: currentState.time,
    };
    dispatch({ type: 'ADD_COURSE', course: newCourse });
    dispatch({
      type: 'UPDATE_STUDENT',
      student: { ...student, status: 'studying', currentCourseId: newCourse.id, studyProgress: 0 },
    });
    return `开始学习: ${def.name}`;
  };

  const executeScheduleTrain = (entry: ScheduleEntry): string => {
    const currentState = stateRef.current;
    const student = currentState.students.find((s) => s.id === entry.studentId);
    if (!student) return '学员不存在';
    if (student.status === 'studying' || student.status === 'dungeon') return '学员忙碌中';

    const efficiencyMult = getEfficiencyMultiplier(student.fatigue, student.maxFatigue, student.morale);
    const duration = entry.duration;
    const fatigueCost = Math.floor(duration * FATIGUE_CONFIG.STUDY_COST_PER_MINUTE * 1.5 / 60);
    const trainBonus = Math.floor(duration / 30 * efficiencyMult);

    if (student.fatigue + fatigueCost > student.maxFatigue) {
      return '疲劳度过高';
    }

    const newStats = { ...student.stats };
    newStats.attack += trainBonus;
    newStats.defense += Math.floor(trainBonus * 0.7);
    newStats.maxHp += Math.floor(trainBonus * 2);
    newStats.hp = Math.min(newStats.maxHp, newStats.hp + Math.floor(trainBonus * 2));

    dispatch({
      type: 'UPDATE_STUDENT',
      student: {
        ...student,
        stats: newStats,
        status: 'training',
        fatigue: Math.min(student.maxFatigue, student.fatigue + fatigueCost),
        morale: Math.max(0, student.morale - 3),
      },
    });
    dispatch({ type: 'UPDATE_ACADEMY_EXP', exp: Math.floor(trainBonus * 3) });
    return `训练完成: 攻击+${trainBonus}, 防御+${Math.floor(trainBonus * 0.7)}, HP+${Math.floor(trainBonus * 2)}`;
  };

  const executeScheduleRest = (entry: ScheduleEntry): string => {
    const currentState = stateRef.current;
    const student = currentState.students.find((s) => s.id === entry.studentId);
    if (!student) return '学员不存在';

    const duration = entry.duration;
    const recovery = Math.floor(FATIGUE_CONFIG.REST_RECOVERY_PER_MINUTE * duration);
    const hpRecovery = Math.floor(student.stats.maxHp * duration / 720);
    const moraleBonus = Math.floor(duration / 60 * 2);

    const newStats = { ...student.stats };
    newStats.hp = Math.min(newStats.maxHp, newStats.hp + hpRecovery);

    dispatch({
      type: 'UPDATE_STUDENT',
      student: {
        ...student,
        status: 'resting',
        fatigue: Math.max(0, student.fatigue - recovery),
        morale: Math.min(100, student.morale + moraleBonus),
        stats: newStats,
      },
    });
    return `休息完成: 恢复疲劳${recovery}, HP+${hpRecovery}, 士气+${moraleBonus}`;
  };

  const executeScheduleDungeon = (entry: ScheduleEntry): string => {
    const currentState = stateRef.current;
    const student = currentState.students.find((s) => s.id === entry.studentId);
    if (!student) return '学员不存在';
    if (student.status === 'studying' || student.status === 'dungeon') return '学员忙碌中';

    const difficulty = 'easy';
    const fatigueCost = FATIGUE_CONFIG.DUNGEON_COST_BASE + 
      FATIGUE_CONFIG.DUNGEON_COST_PER_DIFFICULTY[difficulty];
    if (student.fatigue + fatigueCost > student.maxFatigue) {
      return '疲劳度过高';
    }
    if (student.stats.hp < student.stats.maxHp * 0.3) {
      return '生命值过低';
    }

    const enemyPower = 50 + 20 * currentState.academyLevel;
    const studentPower = (student.stats.attack + student.stats.defense + student.stats.magic) * (student.level * 0.5 + 1);
    const winRate = Math.min(0.9, Math.max(0.2, studentPower / (enemyPower + studentPower)));
    const victory = Math.random() < winRate;

    const goldReward = victory ? Math.floor(50 + 30 * currentState.academyLevel) : 10;
    const manaReward = victory ? Math.floor(20 + 10 * currentState.academyLevel) : 5;
    const expReward = victory ? Math.floor(30 + 15 * (student.level)) : 5;

    const newHp = Math.max(1, student.stats.hp - Math.floor((victory ? 0.1 : 0.3) * student.stats.maxHp));

    dispatch({ type: 'ADD_RESOURCES', resources: { gold: goldReward, mana: manaReward } });
    dispatch({
      type: 'UPDATE_STUDENT',
      student: {
        ...student,
        status: 'idle',
        exp: student.exp + expReward,
        stats: { ...student.stats, hp: newHp },
        fatigue: Math.min(student.maxFatigue, student.fatigue + fatigueCost),
        morale: victory ? Math.min(100, student.morale + 3) : Math.max(0, student.morale - 5),
      },
    });
    dispatch({ type: 'INCREMENT_DUNGEON_RUNS', victory });
    dispatch({ type: 'UPDATE_ACADEMY_EXP', exp: Math.floor((goldReward + manaReward) / 10) });
    return victory ? `副本胜利! 获得 💰${goldReward} 🔮${manaReward} EXP+${expReward}` :
                    `副本失败, 获得 💰${goldReward} 🔮${manaReward} EXP+${expReward}`;
  };

  const executeScheduledActivities = (): string[] => {
    const currentState = stateRef.current;
    if (!currentState.schedule.autoExecute) return [];
    
    const currentTime = currentState.time;
    const results: string[] = [];
    const completedEntries: Array<{ id: string; result: string }> = [];

    for (const entry of currentState.schedule.entries) {
      if (entry.status === 'completed' || entry.status === 'skipped') continue;

      const entryEndTime = entry.startTime + entry.duration;
      if (entryEndTime <= currentTime && (!entry.status || entry.status === 'pending')) {
        continue;
      }

      if (entry.startTime <= currentTime && (!entry.status || entry.status === 'pending')) {
        let result = '';
        switch (entry.activity) {
          case 'study':
            result = executeScheduleStudy(entry);
            break;
          case 'train':
            result = executeScheduleTrain(entry);
            completedEntries.push({ id: entry.id, result });
            break;
          case 'rest':
            result = executeScheduleRest(entry);
            completedEntries.push({ id: entry.id, result });
            break;
          case 'dungeon':
            result = executeScheduleDungeon(entry);
            completedEntries.push({ id: entry.id, result });
            break;
          default:
            result = '空闲';
            completedEntries.push({ id: entry.id, result });
        }
        const student = currentState.students.find((s) => s.id === entry.studentId);
        if (result) {
          results.push(`${student?.name || '?'} @ ${formatGameTime(entry.startTime)}: ${result}`);
        }
      }

      if (entry.status === 'active' && entry.startTime + entry.duration <= currentTime) {
        const student = currentState.students.find((s) => s.id === entry.studentId);
        if (student && (student.status === 'studying' || student.status === 'training' || student.status === 'resting')) {
          dispatch({
            type: 'UPDATE_STUDENT',
            student: { ...student, status: 'idle', currentCourseId: undefined, studyProgress: 0 },
          });
        }
        completedEntries.push({ id: entry.id, result: entry.result || '完成' });
      }
    }

    for (const { id, result } of completedEntries) {
      dispatch({ type: 'UPDATE_SCHEDULE_ENTRY_STATUS', entryId: id, status: 'completed', result });
    }

    return results;
  };

  const expireMissedSchedules = () => {
    const currentState = stateRef.current;
    const currentTime = currentState.time;
    
    for (const entry of currentState.schedule.entries) {
      const entryEndTime = entry.startTime + entry.duration;
      if (entryEndTime <= currentTime && (!entry.status || entry.status === 'pending')) {
        dispatch({ type: 'UPDATE_SCHEDULE_ENTRY_STATUS', entryId: entry.id, status: 'skipped', result: '错过时间' });
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = stateRef.current;
      const prevTime = currentState.time;
      const prevDay = currentState.day;

      dispatch({ type: 'TICK_TIME' });

      setTimeout(() => {
        const afterTick = stateRef.current;
        const crossedDay = afterTick.day !== prevDay && afterTick.day > prevDay;

        if (currentState.courses.length > 0) {
          const updatedCourses: Course[] = [];
          const coursesToComplete: Course[] = [];

          for (const course of currentState.courses) {
            const newProgress = course.progress + 1;
            if (newProgress >= course.duration) {
              coursesToComplete.push(course);
            } else {
              updatedCourses.push({ ...course, progress: newProgress });
            }
          }

          if (updatedCourses.length !== currentState.courses.length || 
              updatedCourses.some((c, i) => c.progress !== currentState.courses[i]?.progress)) {
            dispatch({ type: 'UPDATE_ALL_COURSES', courses: updatedCourses });
          }

          for (const course of coursesToComplete) {
            setTimeout(() => completeCourse(course), 0);
          }
        }

        if (afterTick.schedule.autoExecute) {
          expireMissedSchedules();
          executeScheduledActivities();
        }

        if (crossedDay) {
          const s = stateRef.current;
          for (const entry of s.schedule.entries) {
            if (entry.status !== 'completed') {
              dispatch({
                type: 'UPDATE_SCHEDULE_ENTRY_STATUS',
                entryId: entry.id,
                status: 'pending',
                result: undefined,
              });
            }
          }
        }
      }, 10);
    }, TIME_CONFIG.TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const saveGame = () => {
    try {
      const toSave = { ...state, lastSaveTime: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      dispatch({ type: 'SAVE_NOW' });
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const loadGame = (): boolean => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const loadedState = migrateSaveData(parsed);
        dispatch({ type: 'LOAD_STATE', state: loadedState });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    if (state.settings.autoSave) {
      const interval = setInterval(saveGame, 30000);
      return () => clearInterval(interval);
    }
  }, [state.settings.autoSave, state]);

  const addRecruitHistory = (entries: RecruitHistoryEntry[]) => {
    for (const entry of entries) {
      dispatch({ type: 'ADD_RECRUIT_HISTORY', entry });
    }
  };

  const updateRecruitStats = (update: Partial<RecruitStats>) => {
    dispatch({ type: 'UPDATE_RECRUIT_STATS', stats: update });
  };

  const updatePityCounters = (counters: PityCounter[]) => {
    for (const counter of counters) {
      dispatch({ type: 'UPDATE_PITY_COUNTER', poolId: counter.poolId, counter });
    }
  };

  const batchRecruitUpdate = (historyEntries: RecruitHistoryEntry[], statsUpdate: Partial<RecruitStats>, pityUpdates: PityCounter[]) => {
    dispatch({ type: 'BATCH_RECRUIT_UPDATE', historyEntries, statsUpdate, pityUpdates });
  };

  const getPoolEndTime = (poolId: PoolType): number | undefined => {
    return state.limitedPoolEndTimes[poolId as keyof LimitedPoolEndTimes];
  };

  const resetLimitedPool = (poolId: PoolType) => {
    const poolDef = RECRUIT_POOL_DEFS[poolId];
    if (poolDef?.isLimited && poolDef.defaultDurationMs) {
      dispatch({
        type: 'SET_LIMITED_POOL_END_TIME',
        poolId,
        endTime: Date.now() + poolDef.defaultDurationMs,
      });
    }
  };

  const canAffordMaterials = (materials: Partial<Record<MaterialType, number>>): boolean => {
    for (const [type, amount] of Object.entries(materials)) {
      if (amount !== undefined && (state.materials[type as MaterialType] || 0) < amount) {
        return false;
      }
    }
    return true;
  };

  const getAlchemyLevel = (): number => {
    const alchemyLab = state.buildings.find((b) => b.type === 'alchemy_lab');
    return alchemyLab?.level || 0;
  };

  const equipItem = (studentId: string, equipmentId: string, slot: EquipmentSlot) => {
    dispatch({ type: 'EQUIP_ITEM', studentId, equipmentId, slot });
  };

  const unequipItem = (studentId: string, slot: EquipmentSlot) => {
    dispatch({ type: 'UNEQUIP_ITEM', studentId, slot });
  };

  const usePotion = (studentId: string, potionId: string, quantity: number = 1) => {
    dispatch({ type: 'USE_POTION', studentId, potionId, quantity });
  };

  const startCrafting = (recipe: Recipe) => {
    if (!canAfford(state.resources, { gold: recipe.goldCost, mana: recipe.manaCost })) return;
    if (!canAffordMaterials(Object.fromEntries(recipe.materials.map((m) => [m.type, m.quantity])))) return;

    dispatch({ type: 'SPEND_RESOURCES', resources: { gold: recipe.goldCost, mana: recipe.manaCost } });
    dispatch({ type: 'SPEND_MATERIALS', materials: Object.fromEntries(recipe.materials.map((m) => [m.type, m.quantity])) });

    const job: CraftingJob = {
      id: generateId(),
      recipeId: recipe.id,
      startTime: Date.now(),
      endTime: Date.now() + recipe.craftTime * 1000,
      completed: false,
      claimed: false,
    };

    dispatch({ type: 'START_CRAFTING', job });
  };

  const claimCrafting = (jobId: string) => {
    const job = state.craftingJobs.find((j) => j.id === jobId);
    if (!job || !job.completed || job.claimed) return;

    const recipe = RECIPES.find((r) => r.id === job.recipeId);
    if (!recipe) return;

    if (recipe.type === 'equipment') {
      const def = EQUIPMENT_DEFS[recipe.outputId];
      if (def) {
        for (let i = 0; i < recipe.outputQuantity; i++) {
          const equipment: Equipment = {
            id: generateId(),
            defId: recipe.outputId,
            slot: def.slot,
            level: def.level,
            isEquipped: false,
            createdAt: Date.now(),
          };
          dispatch({ type: 'ADD_EQUIPMENT', equipment });
        }
      }
    } else if (recipe.type === 'potion') {
      const def = POTION_DEFS[recipe.outputId];
      if (def) {
        const potion: Potion = {
          id: generateId(),
          defId: recipe.outputId,
          isUsed: false,
          quantity: recipe.outputQuantity,
        };
        dispatch({ type: 'ADD_POTION', potion });
      }
    }

    dispatch({ type: 'CLAIM_CRAFTING', jobId });
  };

  const addEquipment = (equipment: Equipment) => {
    dispatch({ type: 'ADD_EQUIPMENT', equipment });
  };

  const addPotion = (potion: Potion) => {
    dispatch({ type: 'ADD_POTION', potion });
  };

  const addMaterials = (materials: Partial<Record<MaterialType, number>>) => {
    dispatch({ type: 'ADD_MATERIALS', materials });
  };

  const addMasteryExp = (studentId: string, courseType: CourseType, exp: number) => {
    dispatch({ type: 'ADD_MASTERY_EXP', studentId, courseType, exp });
  };

  const promoteStudent = (studentId: string, targetClass: StudentClass) => {
    dispatch({ type: 'PROMOTE_STUDENT', studentId, targetClass });
  };

  const addClassExp = (studentId: string, exp: number) => {
    dispatch({ type: 'ADD_CLASS_EXP', studentId, exp });
  };

  const getStudentMastery = (studentId: string, courseType: CourseType): CourseMastery => {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return utilsGetStudentMastery({ id: '', masteries: [] } as unknown as Student, courseType);
    return utilsGetStudentMastery(student, courseType);
  };

  const checkPromotionAvailability = (studentId: string) => {
    dispatch({ type: 'CHECK_PROMOTION_AVAILABILITY', studentId });
  };

  const calculateMasterySettlementBonus = (student: Student) => {
    return utilsCalculateMasterySettlementBonus(student);
  };

  const calculateClassSettlementBonus = (student: Student) => {
    return utilsCalculateClassSettlementBonus(student);
  };

  const canAccessCourse = (student: Student, courseDef: CourseDef) => {
    return utilsCanAccessCourse(student, courseDef, state.academyLevel);
  };

  const canPromoteToClass = (studentId: string, targetClass: StudentClass) => {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return { canPromote: false, reasons: ['学员不存在'] };
    return utilsCanPromoteToClass(student, targetClass);
  };

  const getAvailablePromotions = (studentId: string): ClassDef[] => {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return [];
    return utilsGetAvailablePromotions(student);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'UPDATE_CRAFTING_JOBS' });
      dispatch({ type: 'EXPIRE_POTIONS' });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const contextValue: GameContextType = {
    state,
    dispatch,
    getBuildingCost,
    canAfford: (cost) => canAfford(state.resources, cost),
    getStudentCapacity: () => getStudentCapacity(state.buildings),
    saveGame,
    loadGame,
    getFatigueLevel,
    getEfficiencyMultiplier,
    updateStudentFatigue,
    addScheduleEntry,
    removeScheduleEntry,
    clearSchedule,
    restStudent,
    migrateSaveData,
    advanceMinutes,
    toggleAutoExecute,
    triggerNewDay,
    executeScheduledActivities,
    addRecruitHistory,
    updateRecruitStats,
    updatePityCounters,
    batchRecruitUpdate,
    getPoolEndTime,
    resetLimitedPool,
    canAffordMaterials,
    equipItem,
    unequipItem,
    usePotion,
    startCrafting,
    claimCrafting,
    getAlchemyLevel,
    addEquipment,
    addPotion,
    addMaterials,
    addMasteryExp,
    promoteStudent,
    addClassExp,
    canPromoteToClass,
    getAvailablePromotions,
    getStudentMastery,
    checkPromotionAvailability,
    calculateMasterySettlementBonus,
    calculateClassSettlementBonus,
    canAccessCourse,
  };

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

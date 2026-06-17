import { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { GameState, Resources, Building, Student, Course, BuildingType, CourseType, ScheduleEntry, ActivityType } from '../types/game';
import { BUILDING_DEFS, INITIAL_RESOURCES, STUDENT_CAPACITY_BASE, STUDENT_CAPACITY_PER_LEVEL, COURSE_DEFS, FATIGUE_CONFIG } from '../data/gameData';
import { levelUpStudent, generateId } from '../utils/gameUtils';

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
  | { type: 'REST_STUDENT'; studentId: string; duration: number };

const STORAGE_KEY = 'magic_academy_save';

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
    },
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
  addScheduleEntry: (entry: Omit<ScheduleEntry, 'id'>) => void;
  removeScheduleEntry: (entryId: string) => void;
  clearSchedule: () => void;
  restStudent: (studentId: string, duration: number) => void;
  migrateSaveData: (savedState: any) => GameState;
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
      })),
      schedule: savedState.schedule || {
        day: savedState.day || 1,
        entries: [],
      },
    };
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
      updatedStudent = levelUpStudent(updatedStudent);

      dispatch({ type: 'UPDATE_STUDENT', student: updatedStudent });
      dispatch({ type: 'UPDATE_ACADEMY_EXP', exp: Math.floor(totalExp / 5) });
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

  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = stateRef.current;
      if (currentState.courses.length === 0) return;

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
        if (updatedCourses.length > 0 && coursesToComplete.length === 0) {
          dispatch({ type: 'UPDATE_ALL_COURSES', courses: updatedCourses });
        } else if (updatedCourses.length > 0) {
          dispatch({ type: 'UPDATE_ALL_COURSES', courses: updatedCourses });
        }
      }

      for (const course of coursesToComplete) {
        setTimeout(() => completeCourse(course), 0);
      }
    }, 1000);

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

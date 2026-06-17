import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { DUNGEON_DEFS, DIFFICULTY_NAMES, DIFFICULTY_COLORS, RARITY_COLORS, RARITY_NAMES, ELEMENT_ICONS, ELEMENT_NAMES, ELEMENT_COLORS, EQUIPMENT_DEFS, POTION_DEFS, MATERIAL_DEFS } from '../data/gameData';
import { Student, DungeonDef, BattleUnit, BattleLogEntry, Enemy, Equipment, Potion } from '../types/game';
import { simulateBattle, formatNumber, levelUpStudent, getFatigueLevel, getFatigueLevelColor, calculateDungeonFatigueCost, generateDungeonDrops } from '../utils/gameUtils';

interface Props {}

export function DungeonModule({}: Props) {
  const { state, dispatch, canAfford } = useGame();
  const [selectedDungeon, setSelectedDungeon] = useState<DungeonDef | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [battleState, setBattleState] = useState<{
    active: boolean;
    playerUnits: BattleUnit[];
    enemyUnits: BattleUnit[];
    log: BattleLogEntry[];
    currentTurn: number;
    result: {
      victory: boolean;
      expGained: number;
      survivors: string[];
      equipmentDrops: Equipment[];
      potionDrops: Potion[];
      materialDrops: { type: string; quantity: number }[];
    } | null;
  } | null>(null);
  const [animating, setAnimating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const MAX_TEAM_SIZE = 4;
  const idleStudents = state.students.filter((s) => s.status === 'idle' && s.stats.hp > 0);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleTeamMember = (studentId: string) => {
    setSelectedTeam((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }
      if (prev.length >= MAX_TEAM_SIZE) {
        showNotification(`⚠️ 队伍最多${MAX_TEAM_SIZE}人`);
        return prev;
      }
      return [...prev, studentId];
    });
  };

  const startBattle = () => {
    if (!selectedDungeon || selectedTeam.length === 0) return;
    const cost = { gold: selectedDungeon.staminaCost * 10 };
    if (!canAfford(cost)) {
      showNotification('⚠️ 金币不足');
      return;
    }
    const levelOk = selectedTeam.every((id) => {
      const s = state.students.find((st) => st.id === id);
      return s && s.level >= selectedDungeon.requiredLevel;
    });
    if (!levelOk) {
      showNotification(`⚠️ 部分学员等级不足（需要 Lv.${selectedDungeon.requiredLevel}）`);
      return;
    }

    const fatigueCost = calculateDungeonFatigueCost(selectedDungeon.difficulty);
    const exhaustedStudents = selectedTeam.filter((id) => {
      const s = state.students.find((st) => st.id === id);
      return s && s.fatigue + fatigueCost > s.maxFatigue * 0.85;
    });
    if (exhaustedStudents.length > 0) {
      showNotification(`⚠️ ${exhaustedStudents.length} 名学员过于疲劳，战斗力将大幅降低`);
    }

    const tiredStudents = selectedTeam.filter((id) => {
      const s = state.students.find((st) => st.id === id);
      return s && s.fatigue > s.maxFatigue * 0.5;
    });
    if (tiredStudents.length > 0 && exhaustedStudents.length === 0) {
      showNotification(`💡 ${tiredStudents.length} 名学员状态不佳，建议先休息`);
    }

    dispatch({ type: 'SPEND_RESOURCES', resources: cost });

    for (const studentId of selectedTeam) {
      dispatch({ type: 'UPDATE_FATIGUE', studentId, delta: fatigueCost });
    }

    const players: Student[] = selectedTeam
      .map((id) => state.students.find((s) => s.id === id)!)
      .filter(Boolean);
    const playerUnits: BattleUnit[] = players.map((s) => ({
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
    const enemyUnits: BattleUnit[] = selectedDungeon.enemies.map((e: Enemy) => ({
      id: e.id,
      name: e.name,
      isPlayer: false,
      hp: e.hp,
      maxHp: e.maxHp,
      attack: e.attack,
      defense: e.defense,
      magic: e.magic,
      speed: e.speed,
      element: e.element,
      icon: e.icon,
      alive: true,
    }));

    setBattleState({
      active: true,
      playerUnits,
      enemyUnits,
      log: [],
      currentTurn: 0,
      result: null,
    });

    setTimeout(() => runSimulation(players, selectedDungeon.enemies), 500);
  };

  const runSimulation = (players: Student[], enemies: Enemy[]) => {
    setAnimating(true);
    const result = simulateBattle(players, enemies);
    const trainingGround = state.buildings.find((b) => b.type === 'training_ground');
    const rewardBonus = 1 + (trainingGround?.level || 0) * 0.05;

    let turnIndex = 0;
    const playNext = () => {
      if (turnIndex < result.battleLog.length) {
        const logsSoFar = result.battleLog.slice(0, turnIndex + 1);
        const lastLog = result.battleLog[turnIndex];
        setBattleState((prev) => {
          if (!prev) return prev;
          const isPlayerAttack = prev.playerUnits.some((u) => u.name === lastLog.attacker);
          const targetList = isPlayerAttack ? prev.enemyUnits : prev.playerUnits;
          const updatedTargets = targetList.map((u) => {
            if (u.name === lastLog.target) {
              const newHp = Math.max(0, u.hp - lastLog.damage);
              return { ...u, hp: newHp, alive: newHp > 0 };
            }
            return u;
          });
          return {
            ...prev,
            log: logsSoFar,
            currentTurn: lastLog.turn,
            playerUnits: isPlayerAttack ? prev.playerUnits : updatedTargets,
            enemyUnits: isPlayerAttack ? updatedTargets : prev.enemyUnits,
          };
        });
        turnIndex++;
        setTimeout(playNext, 400);
      } else {
        setTimeout(() => finishBattle(result, rewardBonus, players), 600);
      }
    };
    playNext();
  };

  const finishBattle = (
    result: { victory: boolean; expGained: number; survivors: string[] },
    rewardBonus: number,
    players: Student[]
  ) => {
    let equipmentDrops: Equipment[] = [];
    let potionDrops: Potion[] = [];
    let materialDrops: { type: string; quantity: number }[] = [];

    if (result.victory && selectedDungeon) {
      const drops = generateDungeonDrops(selectedDungeon.difficulty, result.victory);
      equipmentDrops = drops.equipment;
      potionDrops = drops.potions;
      materialDrops = Object.entries(drops.materials).map(([type, quantity]) => ({
        type,
        quantity: quantity || 0,
      }));
    }

    setBattleState((prev) => {
      if (!prev || !selectedDungeon) return prev;
      return {
        ...prev,
        active: false,
        result: {
          victory: result.victory,
          expGained: result.expGained,
          survivors: result.survivors,
          equipmentDrops,
          potionDrops,
          materialDrops,
        },
      };
    });

    dispatch({ type: 'INCREMENT_DUNGEON_RUNS', victory: result.victory });

    if (result.victory && selectedDungeon) {
      const rewards = {
        gold: Math.floor(selectedDungeon.rewards.gold * rewardBonus),
        mana: Math.floor(selectedDungeon.rewards.mana * rewardBonus),
        crystals: Math.floor(selectedDungeon.rewards.crystals * rewardBonus),
        materials: Math.floor(selectedDungeon.rewards.materials * rewardBonus),
      };
      dispatch({ type: 'ADD_RESOURCES', resources: rewards });
      dispatch({ type: 'UPDATE_ACADEMY_EXP', exp: Math.floor(result.expGained / 3) });

      for (const equipment of equipmentDrops) {
        dispatch({ type: 'ADD_EQUIPMENT', equipment });
      }
      for (const potion of potionDrops) {
        dispatch({ type: 'ADD_POTION', potion });
      }
      for (const mat of materialDrops) {
        dispatch({ type: 'ADD_MATERIALS', materials: { [mat.type]: mat.quantity } });
      }

      const expPerSurvivor = Math.floor(result.expGained / Math.max(1, result.survivors.length));
      for (const survivorId of result.survivors) {
        const student = state.students.find((s) => s.id === survivorId);
        if (student) {
          let updated = { ...student, exp: student.exp + expPerSurvivor };
          updated = levelUpStudent(updated, state.equipment, state.potions);
          dispatch({ type: 'UPDATE_STUDENT', student: updated });
        }
      }
    }

    for (const player of players) {
      const student = state.students.find((s) => s.id === player.id);
      if (student) {
        const survived = result.survivors.includes(player.id);
        const newHp = survived ? Math.max(1, Math.floor(student.stats.maxHp * 0.3)) : 1;
        dispatch({
          type: 'UPDATE_STUDENT',
          student: {
            ...student,
            stats: { ...student.stats, hp: newHp },
            morale: Math.max(0, student.morale - (survived ? 10 : 25)),
            status: 'resting',
          },
        });
      }
    }

    setTimeout(() => {
      const restingStudents = state.students.filter(
        (s) => s.status === 'resting' && s.stats.hp < s.stats.maxHp
      );
      for (const s of restingStudents) {
        const healAmount = Math.floor(s.stats.maxHp * 0.1);
        const newHp = Math.min(s.stats.maxHp, s.stats.hp + healAmount);
        if (newHp >= s.stats.maxHp * 0.8) {
          dispatch({
            type: 'UPDATE_STUDENT',
            student: { ...s, stats: { ...s.stats, hp: s.stats.maxHp }, status: 'idle', morale: Math.min(100, s.morale + 20) },
          });
        } else {
          dispatch({
            type: 'UPDATE_STUDENT',
            student: { ...s, stats: { ...s.stats, hp: newHp } },
          });
        }
      }
    }, 10000);

    setAnimating(false);
  };

  const closeBattle = () => {
    setBattleState(null);
    setSelectedDungeon(null);
    setSelectedTeam([]);
  };

  const renderHealthBar = (unit: BattleUnit) => {
    const percent = (unit.hp / unit.maxHp) * 100;
    const color = percent > 50 ? 'bg-green-500' : percent > 25 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="w-full">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-300`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5 text-center">
          {unit.hp} / {unit.maxHp}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-pulse">
          {notification}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>⚔️</span> 试炼副本
        </h2>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800/80 px-4 py-2 rounded-lg border border-red-600/50">
            <span className="text-gray-400 text-sm">战绩: </span>
            <span className="text-green-400 font-bold">{state.totalVictories}</span>
            <span className="text-gray-500 text-sm"> / {state.dungeonRuns}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <span>🗺️</span> 选择副本
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DUNGEON_DEFS.map((dungeon) => {
            const isSelected = selectedDungeon?.id === dungeon.id;
            const minLevel = Math.min(...state.students.map((s) => s.level), 999);
            const canEnter = state.students.length > 0 && minLevel >= dungeon.requiredLevel || state.students.some((s) => s.level >= dungeon.requiredLevel);
            return (
              <div
                key={dungeon.id}
                onClick={() => canEnter && setSelectedDungeon(dungeon)}
                className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-900/20 scale-[1.02]'
                    : canEnter
                    ? 'border-slate-600 bg-slate-800/50 hover:border-purple-400 hover:scale-[1.01]'
                    : 'border-slate-700 bg-slate-800/20 opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: DIFFICULTY_COLORS[dungeon.difficulty] }}
                >
                  {DIFFICULTY_NAMES[dungeon.difficulty]}
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-5xl">
                    {dungeon.difficulty === 'easy' ? '🌲' : dungeon.difficulty === 'normal' ? '💎' : dungeon.difficulty === 'hard' ? '🌋' : '🌑'}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white mb-1">{dungeon.name}</h4>
                    <p className="text-sm text-gray-400 mb-2">{dungeon.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-slate-700/80 px-2 py-0.5 rounded text-gray-300">
                        需要 Lv.{dungeon.requiredLevel}
                      </span>
                      <span className="bg-yellow-900/50 px-2 py-0.5 rounded text-yellow-300">
                        💰 进入: {dungeon.staminaCost * 10}
                      </span>
                      <span className="bg-orange-900/50 px-2 py-0.5 rounded text-orange-300">
                        😓 疲劳: {calculateDungeonFatigueCost(dungeon.difficulty)}
                      </span>
                      <span className="bg-red-900/50 px-2 py-0.5 rounded text-red-300">
                        👹 {dungeon.enemies.length}只怪物
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-600/50">
                  <div className="text-xs text-gray-500 mb-1">可能掉落:</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-yellow-900/30 px-2 py-0.5 rounded text-yellow-400 text-xs">
                      💰 {formatNumber(dungeon.rewards.gold)}
                    </span>
                    <span className="bg-blue-900/30 px-2 py-0.5 rounded text-blue-400 text-xs">
                      💎 {formatNumber(dungeon.rewards.mana)}
                    </span>
                    <span className="bg-purple-900/30 px-2 py-0.5 rounded text-purple-400 text-xs">
                      💠 {dungeon.rewards.crystals}
                    </span>
                    <span className="bg-green-900/30 px-2 py-0.5 rounded text-green-400 text-xs">
                      📦 材料
                    </span>
                    <span className="bg-orange-900/30 px-2 py-0.5 rounded text-orange-400 text-xs">
                      ⚔️ 装备
                    </span>
                    <span className="bg-pink-900/30 px-2 py-0.5 rounded text-pink-400 text-xs">
                      🧪 药剂
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-3 left-3">
                    <span className="text-yellow-400 text-2xl">✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDungeon && (
        <div className="bg-slate-800/50 rounded-xl border border-purple-600/50 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>👥</span> 组建队伍 ({selectedTeam.length}/{MAX_TEAM_SIZE})
            </h3>
            {selectedTeam.length > 0 && (
              <button
                onClick={() => setSelectedTeam([])}
                className="text-xs text-red-400 hover:text-red-300"
              >
                清空队伍
              </button>
            )}
          </div>

          {idleStudents.length === 0 ? (
            <div className="text-center py-6 bg-slate-800/30 rounded-lg border border-dashed border-slate-600">
              <p className="text-gray-500">没有可出战的学员</p>
              <p className="text-xs text-gray-600 mt-1">学员需要处于空闲状态且生命值大于0</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
              {idleStudents.map((student) => {
                const isSelected = selectedTeam.includes(student.id);
                const levelOk = student.level >= selectedDungeon.requiredLevel;
                const hpPercent = (student.stats.hp / student.stats.maxHp) * 100;
                return (
                  <button
                    key={student.id}
                    onClick={() => levelOk && toggleTeamMember(student.id)}
                    disabled={!levelOk}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-green-400 bg-green-900/30'
                        : !levelOk
                        ? 'border-slate-700 bg-slate-800/20 opacity-50'
                        : 'border-slate-600 bg-slate-800/50 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-1">{student.avatar}</div>
                      <div className="text-sm font-bold text-white truncate">{student.name.split('·')[0]}</div>
                      <div className="flex items-center justify-center gap-1 text-xs mt-1">
                        <span style={{ color: RARITY_COLORS[student.rarity] }}>Lv.{student.level}</span>
                        <span style={{ color: ELEMENT_COLORS[student.element] }}>{ELEMENT_ICONS[student.element]}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>
                      <div className="h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(student.fatigue / student.maxFatigue) * 100}%`,
                            backgroundColor: getFatigueLevelColor(getFatigueLevel(student.fatigue, student.maxFatigue)),
                          }}
                        />
                      </div>
                      <div className="text-[8px] text-gray-500 mt-0.5">
                        💓{student.fatigue}/{student.maxFatigue}
                      </div>
                    </div>
                    {isSelected && <div className="text-xs text-green-400 text-center mt-1">✓ 出战</div>}
                    {!levelOk && <div className="text-xs text-red-400 text-center mt-1">Lv.{selectedDungeon.requiredLevel}+</div>}
                    {levelOk && student.fatigue > student.maxFatigue * 0.6 && (
                      <div className="text-xs text-yellow-400 text-center mt-1">⚠️ 疲劳</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              onClick={startBattle}
              disabled={selectedTeam.length === 0 || animating}
              className="px-8 py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              ⚔️ 开始挑战！
            </button>
          </div>
        </div>
      )}

      {battleState && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-900 to-purple-950 rounded-2xl border-2 border-red-500 max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-red-500/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <span>⚔️</span> {selectedDungeon?.name} - {battleState.active ? `第 ${battleState.currentTurn || 1} 回合` : battleState.result ? '战斗结束' : '准备中...'}
              </h3>
              {battleState.result && (
                <button
                  onClick={closeBattle}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold"
                >
                  关闭
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <h4 className="text-sm text-red-400 mb-2 flex items-center gap-1">
                  <span>👹</span> 敌方阵容
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {battleState.enemyUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className={`bg-red-900/20 rounded-xl p-3 border-2 transition-all ${
                        unit.alive ? 'border-red-500/50' : 'border-gray-700 opacity-40 grayscale'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-5xl mb-2 ${!unit.alive ? '' : battleState.log[battleState.log.length - 1]?.attacker === unit.name ? 'animate-bounce' : ''}`}>
                          {unit.icon}
                        </div>
                        <div className="font-bold text-white text-sm truncate">{unit.name}</div>
                        <div
                          className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded"
                          style={{ background: ELEMENT_COLORS[unit.element] + '30', color: ELEMENT_COLORS[unit.element] }}
                        >
                          {ELEMENT_ICONS[unit.element]} {ELEMENT_NAMES[unit.element]}
                        </div>
                      </div>
                      <div className="mt-2">{renderHealthBar(unit)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center my-4">
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                <span className="px-4 text-2xl text-purple-400">⚡ VS ⚡</span>
                <div className="h-0.5 w-full bg-gradient-to-l from-transparent via-purple-500 to-transparent" />
              </div>

              <div className="mb-6">
                <h4 className="text-sm text-blue-400 mb-2 flex items-center gap-1">
                  <span>🛡️</span> 我方阵容
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {battleState.playerUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className={`bg-blue-900/20 rounded-xl p-3 border-2 transition-all ${
                        unit.alive ? 'border-blue-500/50' : 'border-gray-700 opacity-40 grayscale'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-5xl mb-2 ${!unit.alive ? '' : battleState.log[battleState.log.length - 1]?.attacker === unit.name ? 'animate-bounce' : ''}`}>
                          {unit.icon}
                        </div>
                        <div className="font-bold text-white text-sm truncate">{unit.name}</div>
                        <div
                          className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded"
                          style={{ background: ELEMENT_COLORS[unit.element] + '30', color: ELEMENT_COLORS[unit.element] }}
                        >
                          {ELEMENT_ICONS[unit.element]}
                        </div>
                      </div>
                      <div className="mt-2">{renderHealthBar(unit)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {battleState.log.length > 0 && (
                <div className="bg-slate-900/80 rounded-xl border border-slate-600 p-3 max-h-48 overflow-y-auto">
                  <h4 className="text-sm text-gray-400 mb-2">📜 战斗日志</h4>
                  <div className="space-y-1">
                    {battleState.log.slice(-10).map((log, i) => (
                      <div
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${
                          log.isCrit ? 'bg-yellow-900/30 text-yellow-300' : 'bg-slate-800/50 text-gray-300'
                        }`}
                      >
                        {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {battleState.result && selectedDungeon && (
                <div className={`mt-6 p-6 rounded-xl border-2 ${
                  battleState.result.victory 
                    ? 'bg-gradient-to-r from-yellow-900/40 to-green-900/40 border-yellow-500' 
                    : 'bg-gradient-to-r from-red-900/40 to-gray-900/40 border-red-500'
                }`}>
                  <div className="text-center">
                    <div className="text-6xl mb-3">
                      {battleState.result.victory ? '🏆' : '💀'}
                    </div>
                    <h3 className={`text-3xl font-bold mb-4 ${
                      battleState.result.victory ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {battleState.result.victory ? '胜利！' : '失败...'}
                    </h3>
                    {battleState.result.victory && (
                      <div>
                        <p className="text-lg text-green-300 mb-4">获得经验 {battleState.result.expGained} 点</p>
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                          <span className="bg-yellow-900/50 px-3 py-1.5 rounded-lg text-yellow-300">
                            💰 +{formatNumber(selectedDungeon.rewards.gold)}
                          </span>
                          <span className="bg-blue-900/50 px-3 py-1.5 rounded-lg text-blue-300">
                            💎 +{formatNumber(selectedDungeon.rewards.mana)}
                          </span>
                          <span className="bg-purple-900/50 px-3 py-1.5 rounded-lg text-purple-300">
                            💠 +{selectedDungeon.rewards.crystals}
                          </span>
                        </div>

                        {(battleState.result.equipmentDrops.length > 0 ||
                          battleState.result.potionDrops.length > 0 ||
                          battleState.result.materialDrops.length > 0) && (
                          <div className="mb-4">
                            <h4 className="text-sm text-yellow-400 mb-2 font-bold">✨ 额外掉落</h4>

                            {battleState.result.materialDrops.length > 0 && (
                              <div className="flex flex-wrap justify-center gap-2 mb-2">
                                {battleState.result.materialDrops.map((mat, i) => {
                                  const def = MATERIAL_DEFS[mat.type as keyof typeof MATERIAL_DEFS];
                                  return (
                                    <span
                                      key={i}
                                      className="bg-green-900/50 px-3 py-1.5 rounded-lg text-green-300"
                                    >
                                      {def?.icon} {def?.name} x{mat.quantity}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {battleState.result.equipmentDrops.length > 0 && (
                              <div className="flex flex-wrap justify-center gap-2 mb-2">
                                {battleState.result.equipmentDrops.map((equip) => {
                                  const def = EQUIPMENT_DEFS[equip.defId];
                                  return (
                                    <span
                                      key={equip.id}
                                      className="px-3 py-1.5 rounded-lg text-sm font-bold"
                                      style={{
                                        background: RARITY_COLORS[def.rarity] + '30',
                                        color: RARITY_COLORS[def.rarity],
                                      }}
                                    >
                                      {def.icon} {def.name} (+{equip.level})
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {battleState.result.potionDrops.length > 0 && (
                              <div className="flex flex-wrap justify-center gap-2">
                                {battleState.result.potionDrops.map((potion) => {
                                  const def = POTION_DEFS[potion.defId];
                                  return (
                                    <span
                                      key={potion.id}
                                      className="px-3 py-1.5 rounded-lg text-sm font-bold"
                                      style={{
                                        background: RARITY_COLORS[def.rarity] + '30',
                                        color: RARITY_COLORS[def.rarity],
                                      }}
                                    >
                                      {def.icon} {def.name}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-sm text-gray-400">
                          幸存者: {battleState.result.survivors.length} / {battleState.playerUnits.length}
                        </p>
                      </div>
                    )}
                    {!battleState.result.victory && (
                      <p className="text-gray-400">再接再厉，提升实力后再来挑战！</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

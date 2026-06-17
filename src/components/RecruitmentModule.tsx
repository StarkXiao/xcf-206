import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Student, PoolType, RecruitHistoryEntry, PityCounter, RecruitStats } from '../types/game';
import { RARITY_COLORS, RARITY_NAMES, ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS, RECRUIT_POOL_DEFS, POOL_RARITY_WEIGHTS, CLASS_DEFS, CLASS_TIER_NAMES, CLASS_TIER_COLORS } from '../data/gameData';
import { formatNumber, generateStudentForPool, generateStudentForPoolWithClass, updatePityCounter, getPoolRemainingTime, isPoolActive } from '../utils/gameUtils';
import { ClassPromotionModal } from './ClassPromotionModal';

interface RecruitResult {
  student: Student;
  isPity: boolean;
  isRateUp: boolean;
}

type TabType = 'pools' | 'history' | 'stats';

export function RecruitmentModule() {
  const { state, dispatch, getStudentCapacity, canAfford, batchRecruitUpdate, getPoolEndTime, resetLimitedPool, getAvailablePromotions } = useGame();
  const [selectedPool, setSelectedPool] = useState<PoolType>('standard');
  const [recruitedResults, setRecruitedResults] = useState<RecruitResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pools');
  const [historyFilter, setHistoryFilter] = useState<PoolType | 'all'>('all');
  const [promotionStudent, setPromotionStudent] = useState<Student | null>(null);

  const capacity = getStudentCapacity();
  const currentCount = state.students.length;

  const currentPoolDef = RECRUIT_POOL_DEFS[selectedPool];
  const currentPity = state.pityCounters.find((c) => c.poolId === selectedPool) || {
    poolId: selectedPool,
    currentCount: 0,
    sinceLastEpic: 0,
    sinceLastLegendary: 0,
  };

  const pityProgress = useMemo(() => {
    if (!currentPoolDef) return 0;
    return Math.min(1, currentPity.currentCount / currentPoolDef.pity.hardPity);
  }, [currentPity, currentPoolDef]);

  const isSoftPity = currentPity.currentCount >= currentPoolDef.pity.softPityStart;

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return state.recruitHistory;
    return state.recruitHistory.filter((h) => h.poolId === historyFilter);
  }, [state.recruitHistory, historyFilter]);

  const stats = state.recruitStats;

  const handleRecruit = (count: 1 | 10) => {
    if (isRecruiting) return;

    const cost = count === 1 ? currentPoolDef.cost : currentPoolDef.tenCost;
    if (!canAfford(cost)) return;

    const availableSlots = capacity - currentCount;
    const actualCount = Math.min(count, availableSlots);
    if (actualCount <= 0) {
      alert('学员容量已满！请升级宿舍或解雇学员。');
      return;
    }

    setIsRecruiting(true);
    dispatch({ type: 'SPEND_RESOURCES', resources: cost });

    setTimeout(() => {
      const results: RecruitResult[] = [];
      const historyEntries: RecruitHistoryEntry[] = [];
      let updatedCounters = [...state.pityCounters];
      const statsUpdate: Partial<RecruitStats> = {
        totalPulls: stats.totalPulls + actualCount,
        totalGold: stats.totalGold + (cost.gold || 0),
        totalCrystals: stats.totalCrystals + (cost.crystals || 0),
        rarityCount: { ...stats.rarityCount },
        pityTriggered: stats.pityTriggered,
        rateUpHits: stats.rateUpHits,
      };

      for (let i = 0; i < actualCount; i++) {
        const poolCounter = updatedCounters.find((c) => c.poolId === selectedPool)!;
        const { student, isPity, isRateUp } = generateStudentForPoolWithClass(selectedPool, poolCounter);

        results.push({ student, isPity, isRateUp });
        dispatch({ type: 'ADD_STUDENT', student });

        statsUpdate.rarityCount![student.rarity] = (statsUpdate.rarityCount![student.rarity] || 0) + 1;
        if (isPity) statsUpdate.pityTriggered! += 1;
        if (isRateUp) statsUpdate.rateUpHits! += 1;

        historyEntries.push({
          id: student.id,
          poolId: selectedPool,
          studentId: student.id,
          studentName: student.name,
          rarity: student.rarity,
          element: student.element,
          avatar: student.avatar,
          cost: { gold: Math.floor((cost.gold || 0) / actualCount), crystals: Math.floor((cost.crystals || 0) / actualCount) },
          timestamp: Date.now(),
          isPity,
          isRateUp,
        });

        const newCounter = updatePityCounter(poolCounter, selectedPool, student.rarity);
        updatedCounters = updatedCounters.map((c) =>
          c.poolId === selectedPool ? newCounter : c
        );
      }

      batchRecruitUpdate(historyEntries, statsUpdate, updatedCounters);
      setRecruitedResults(results);
      setShowResults(true);
      setIsRecruiting(false);
    }, 800);
  };

  const handleDismiss = (studentId: string) => {
    if (confirm('确定要解雇这名学员吗？')) {
      dispatch({ type: 'REMOVE_STUDENT', studentId });
      setRecruitedResults((prev) => prev.filter((r) => r.student.id !== studentId));
    }
  };

  const renderStudentCard = (student: Student, isNew: boolean = false, isPity: boolean = false, isRateUp: boolean = false) => (
    <div
      key={student.id}
      className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
        isNew ? 'animate-pulse' : ''
      }`}
      style={{ borderColor: RARITY_COLORS[student.rarity] }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: RARITY_COLORS[student.rarity] }}
      />
      <div className="relative p-3">
        <div className="flex items-center justify-between mb-2">
          <div
            className="px-2 py-0.5 rounded text-xs font-bold text-white"
            style={{ background: RARITY_COLORS[student.rarity] }}
          >
            {RARITY_NAMES[student.rarity]}
          </div>
          <div className="flex items-center gap-1">
            {isPity && (
              <span className="bg-orange-500 px-1.5 py-0.5 rounded text-[10px] text-white font-bold">
                保底!
              </span>
            )}
            {isRateUp && (
              <span className="bg-pink-500 px-1.5 py-0.5 rounded text-[10px] text-white font-bold">
                UP!
              </span>
            )}
            {isNew && !isPity && !isRateUp && (
              <span className="bg-green-500 px-2 py-0.5 rounded text-xs text-white font-bold animate-bounce">
                NEW!
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="text-5xl bg-slate-800/80 w-16 h-16 rounded-lg flex items-center justify-center border border-slate-600">
            {student.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">{student.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: ELEMENT_COLORS[student.element] + '40', color: ELEMENT_COLORS[student.element] }}
              >
                {ELEMENT_ICONS[student.element]} {ELEMENT_NAMES[student.element]}
              </span>
              <span className="text-xs text-purple-300">Lv.{student.level}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: CLASS_TIER_COLORS[student.classTier] + '40', color: CLASS_TIER_COLORS[student.classTier] }}
              >
                {CLASS_DEFS[student.class]?.icon} {CLASS_DEFS[student.class]?.name}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 text-xs mb-2">
          <StatItem label="HP" value={student.stats.maxHp} color="text-red-400" />
          <StatItem label="攻" value={student.stats.attack} color="text-orange-400" />
          <StatItem label="防" value={student.stats.defense} color="text-blue-400" />
          <StatItem label="魔" value={student.stats.magic} color="text-purple-400" />
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {student.skills.map((skill, i) => (
            <span
              key={i}
              className="text-[10px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-600/50"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            士气:{' '}
            <span className={student.morale >= 70 ? 'text-green-400' : student.morale >= 40 ? 'text-yellow-400' : 'text-red-400'}>
              {student.morale}%
            </span>
            <span className="mx-1">·</span>
            疲劳:{' '}
            <span className="text-cyan-400">
              {student.fatigue}/{student.maxFatigue}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {getAvailablePromotions(student.id).length > 0 && (
              <button
                onClick={() => setPromotionStudent(student)}
                className="text-xs bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white px-2 py-0.5 rounded border border-yellow-500/50 font-bold animate-pulse"
              >
                ✨ 转职
              </button>
            )}
            <button
              onClick={() => handleDismiss(student.id)}
              className="text-xs bg-red-900/50 hover:bg-red-800 text-red-400 px-2 py-0.5 rounded border border-red-700/50"
            >
              解雇
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPoolsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.values(RECRUIT_POOL_DEFS) as typeof RECRUIT_POOL_DEFS[string][]).map((pool) => {
          const poolEndTime = getPoolEndTime(pool.id);
          const poolActive = isPoolActive(pool.id, poolEndTime);
          const isSelected = selectedPool === pool.id;
          const poolPity = state.pityCounters.find((c) => c.poolId === pool.id);
          const pityCount = poolPity?.currentCount || 0;
          const remaining = getPoolRemainingTime(poolEndTime);

          return (
            <button
              key={pool.id}
              onClick={() => poolActive && setSelectedPool(pool.id)}
              disabled={!poolActive}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                !poolActive
                  ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                  : isSelected
                  ? 'border-yellow-400 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 shadow-lg shadow-yellow-500/10'
                  : 'border-purple-600/50 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 hover:border-purple-400'
              }`}
            >
              {pool.isLimited && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-pink-600 px-2 py-0.5 rounded text-[10px] text-white font-bold animate-pulse">
                  限时
                </div>
              )}
              <div className="text-4xl mb-2">{pool.icon}</div>
              <h3 className="text-lg font-bold text-white mb-1">{pool.name}</h3>
              <p className="text-gray-400 text-xs mb-2">{pool.description}</p>
              {pool.rateUp && (
                <div className="text-xs mb-1">
                  <span
                    className="px-1.5 py-0.5 rounded font-bold"
                    style={{ background: RARITY_COLORS[pool.rateUp.rarity] + '30', color: RARITY_COLORS[pool.rateUp.rarity] }}
                  >
                    {RARITY_NAMES[pool.rateUp.rarity]} UP x{pool.rateUp.bonusMultiplier}
                  </span>
                  {pool.rateUp.element && (
                    <span className="ml-1 text-gray-400">
                      {ELEMENT_ICONS[pool.rateUp.element]} {ELEMENT_NAMES[pool.rateUp.element]}倾向
                    </span>
                  )}
                </div>
              )}
              {poolActive && (
                <div className="text-xs text-gray-500 mt-1">
                  保底进度: {pityCount}/{pool.pity.hardPity}
                  {pityCount >= pool.pity.softPityStart && (
                    <span className="text-orange-400 ml-1">软保底中!</span>
                  )}
                </div>
              )}
              {pool.isLimited && remaining && (
                <div className="text-xs text-red-400 mt-1">
                  剩余: {remaining}
                </div>
              )}
              {!poolActive && (
                <div className="text-xs text-red-500 mt-1">已结束</div>
              )}
            </button>
          );
        })}
      </div>

      {currentPoolDef && (
        <div className="bg-gradient-to-br from-slate-900/80 to-purple-950/80 rounded-xl border-2 border-purple-600/50 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{currentPoolDef.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-white">{currentPoolDef.name}</h3>
                <p className="text-purple-300 text-sm">{currentPoolDef.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-purple-600/50">
                <span className="text-gray-400 text-sm">容量: </span>
                <span className="text-yellow-400 font-bold">{currentCount}/{capacity}</span>
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-orange-600/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-orange-300">
                🎯 保底进度 ({currentPoolDef.pity.guaranteedRarity === 'epic' ? '史诗' : '传说'}保底)
              </span>
              <span className={`text-sm font-bold ${isSoftPity ? 'text-orange-400' : 'text-gray-300'}`}>
                {currentPity.currentCount} / {currentPoolDef.pity.hardPity}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pityProgress * 100}%`,
                  background: isSoftPity
                    ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                    : pityProgress > 0.5
                    ? 'linear-gradient(90deg, #8B5CF6, #EC4899)'
                    : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-gray-500">0</span>
              <span className="text-[10px] text-orange-400/60">软保底 {currentPoolDef.pity.softPityStart}</span>
              <span className="text-[10px] text-gray-500">硬保底 {currentPoolDef.pity.hardPity}</span>
            </div>
            {isSoftPity && (
              <div className="mt-2 text-xs text-orange-400 bg-orange-900/20 px-2 py-1 rounded">
                ⚡ 已进入软保底区间！高级稀有度概率持续提升中
              </div>
            )}
          </div>

          {currentPoolDef.rateUp && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-pink-600/30">
              <span className="text-sm font-bold text-pink-300">🔥 概率UP详情</span>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="px-2 py-1 rounded text-sm font-bold"
                  style={{ background: RARITY_COLORS[currentPoolDef.rateUp.rarity] + '30', color: RARITY_COLORS[currentPoolDef.rateUp.rarity] }}
                >
                  {RARITY_NAMES[currentPoolDef.rateUp.rarity]}
                </span>
                <span className="text-gray-300 text-sm">出现率 x{currentPoolDef.rateUp.bonusMultiplier}</span>
                {currentPoolDef.rateUp.element && (
                  <span className="text-sm" style={{ color: ELEMENT_COLORS[currentPoolDef.rateUp.element] }}>
                    {ELEMENT_ICONS[currentPoolDef.rateUp.element]} {ELEMENT_NAMES[currentPoolDef.rateUp.element]}倾向
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
            <span className="text-sm font-bold text-gray-300">📊 当前池概率</span>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {(Object.entries(POOL_RARITY_WEIGHTS[selectedPool] || {}) as [string, number][]).map(([rarity, weight]) => {
                const total = Object.values(POOL_RARITY_WEIGHTS[selectedPool] || {}).reduce((a, b) => a + b, 0);
                const pct = ((weight / total) * 100).toFixed(1);
                return (
                  <div key={rarity} className="text-center">
                    <div className="text-xs font-bold" style={{ color: RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] }}>
                      {pct}%
                    </div>
                    <div className="text-[10px] text-gray-500">{RARITY_NAMES[rarity as keyof typeof RARITY_NAMES]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`relative p-4 rounded-xl border-2 transition-all ${
                !canAfford(currentPoolDef.cost) || currentCount >= capacity || isRecruiting
                  ? 'border-gray-700 bg-gray-800/30 opacity-60'
                  : 'border-purple-600 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 hover:border-purple-400'
              }`}
            >
              <div className="text-center mb-3">
                <div className="text-4xl mb-1">🎫</div>
                <h4 className="text-lg font-bold text-white">单次招募</h4>
              </div>
              <div className="flex justify-center gap-3 mb-3">
                {currentPoolDef.cost.gold > 0 && (
                  <span className={`px-3 py-1 rounded-lg font-bold text-sm ${state.resources.gold >= currentPoolDef.cost.gold ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-400'}`}>
                    💰 {formatNumber(currentPoolDef.cost.gold)}
                  </span>
                )}
                {currentPoolDef.cost.crystals > 0 && (
                  <span className={`px-3 py-1 rounded-lg font-bold text-sm ${state.resources.crystals >= currentPoolDef.cost.crystals ? 'bg-purple-900/50 text-purple-300' : 'bg-red-900/50 text-red-400'}`}>
                    💠 {formatNumber(currentPoolDef.cost.crystals)}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRecruit(1)}
                disabled={!canAfford(currentPoolDef.cost) || currentCount >= capacity || isRecruiting}
                className={`w-full py-2.5 rounded-lg font-bold transition-all ${
                  !canAfford(currentPoolDef.cost) || currentCount >= capacity || isRecruiting
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white shadow-lg active:scale-95'
                }`}
              >
                {isRecruiting ? '✨ 召唤中...' : currentCount >= capacity ? '容量已满' : !canAfford(currentPoolDef.cost) ? '资源不足' : '✨ 单抽'}
              </button>
            </div>

            <div
              className={`relative p-4 rounded-xl border-2 transition-all ${
                !canAfford(currentPoolDef.tenCost) || currentCount >= capacity || isRecruiting
                  ? 'border-gray-700 bg-gray-800/30 opacity-60'
                  : 'border-purple-600 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 hover:border-purple-400'
              }`}
            >
              <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 rounded text-xs text-white font-bold">
                十连
              </div>
              <div className="text-center mb-3">
                <div className="text-4xl mb-1">🎟️</div>
                <h4 className="text-lg font-bold text-white">十连招募</h4>
              </div>
              <div className="flex justify-center gap-3 mb-3">
                {currentPoolDef.tenCost.gold > 0 && (
                  <span className={`px-3 py-1 rounded-lg font-bold text-sm ${state.resources.gold >= currentPoolDef.tenCost.gold ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-400'}`}>
                    💰 {formatNumber(currentPoolDef.tenCost.gold)}
                  </span>
                )}
                {currentPoolDef.tenCost.crystals > 0 && (
                  <span className={`px-3 py-1 rounded-lg font-bold text-sm ${state.resources.crystals >= currentPoolDef.tenCost.crystals ? 'bg-purple-900/50 text-purple-300' : 'bg-red-900/50 text-red-400'}`}>
                    💠 {formatNumber(currentPoolDef.tenCost.crystals)}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRecruit(10)}
                disabled={!canAfford(currentPoolDef.tenCost) || currentCount >= capacity || isRecruiting}
                className={`w-full py-2.5 rounded-lg font-bold transition-all ${
                  !canAfford(currentPoolDef.tenCost) || currentCount >= capacity || isRecruiting
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg active:scale-95'
                }`}
              >
                {isRecruiting ? '✨ 召唤中...' : currentCount >= capacity ? '容量已满' : !canAfford(currentPoolDef.tenCost) ? '资源不足' : '✨ 十连'}
              </button>
            </div>
          </div>
        </div>
      )}

      {state.students.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <span>👥</span> 我的学员 ({state.students.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {state.students.map((s) =>
              renderStudentCard(s, recruitedResults.some((r) => r.student.id === s.id))
            )}
          </div>
        </div>
      )}

      {state.students.length === 0 && (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border-2 border-dashed border-purple-600/50">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-purple-300 text-lg mb-2">学院还没有学员</p>
          <p className="text-gray-500 text-sm">快去招募第一批优秀的魔法学员吧！</p>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-400">筛选池:</span>
        <button
          onClick={() => setHistoryFilter('all')}
          className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${historyFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'}`}
        >
          全部
        </button>
        {(Object.values(RECRUIT_POOL_DEFS) as typeof RECRUIT_POOL_DEFS[string][]).map((pool) => (
          <button
            key={pool.id}
            onClick={() => setHistoryFilter(pool.id)}
            className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${historyFilter === pool.id ? 'bg-purple-600 text-white' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'}`}
          >
            {pool.icon} {pool.name}
          </button>
        ))}
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-gray-600">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-400">暂无招募记录</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {filteredHistory.map((entry, i) => (
            <div
              key={`${entry.id}-${i}`}
              className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-all"
            >
              <span className="text-2xl">{entry.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm truncate">{entry.studentName}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: RARITY_COLORS[entry.rarity] + '30', color: RARITY_COLORS[entry.rarity] }}
                  >
                    {RARITY_NAMES[entry.rarity]}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: ELEMENT_COLORS[entry.element] + '20', color: ELEMENT_COLORS[entry.element] }}
                  >
                    {ELEMENT_ICONS[entry.element]}
                  </span>
                  {entry.isPity && (
                    <span className="text-[10px] bg-orange-600/50 text-orange-300 px-1.5 py-0.5 rounded font-bold">保底</span>
                  )}
                  {entry.isRateUp && (
                    <span className="text-[10px] bg-pink-600/50 text-pink-300 px-1.5 py-0.5 rounded font-bold">UP</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {RECRUIT_POOL_DEFS[entry.poolId]?.icon} {RECRUIT_POOL_DEFS[entry.poolId]?.name}
                  <span className="mx-1">·</span>
                  {new Date(entry.timestamp).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStatsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="总招募次数" value={stats.totalPulls} icon="🎰" color="text-purple-400" />
        <StatCard label="消耗金币" value={stats.totalGold} icon="💰" color="text-yellow-400" />
        <StatCard label="消耗水晶" value={stats.totalCrystals} icon="💠" color="text-blue-400" />
        <StatCard label="保底触发" value={stats.pityTriggered} icon="🎯" color="text-orange-400" />
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <h4 className="text-sm font-bold text-gray-300 mb-3">稀有度分布</h4>
        <div className="space-y-2">
          {(['legendary', 'epic', 'rare', 'uncommon', 'common'] as const).map((rarity) => {
            const count = stats.rarityCount[rarity] || 0;
            const pct = stats.totalPulls > 0 ? ((count / stats.totalPulls) * 100).toFixed(1) : '0.0';
            return (
              <div key={rarity} className="flex items-center gap-3">
                <span
                  className="w-12 text-xs font-bold text-right"
                  style={{ color: RARITY_COLORS[rarity] }}
                >
                  {RARITY_NAMES[rarity]}
                </span>
                <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalPulls > 0 ? (count / stats.totalPulls) * 100 : 0}%`,
                      background: RARITY_COLORS[rarity],
                      minWidth: count > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-20 text-right">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h4 className="text-sm font-bold text-gray-300 mb-3">各池保底计数</h4>
          <div className="space-y-2">
            {state.pityCounters.map((counter) => {
              const poolDef = RECRUIT_POOL_DEFS[counter.poolId];
              if (!poolDef) return null;
              const progress = counter.currentCount / poolDef.pity.hardPity;
              return (
                <div key={counter.poolId}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-300">{poolDef.icon} {poolDef.name}</span>
                    <span className={progress >= 0.8 ? 'text-orange-400 font-bold' : 'text-gray-400'}>
                      {counter.currentCount}/{poolDef.pity.hardPity}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progress * 100}%`,
                        background: progress >= 0.8 ? 'linear-gradient(90deg, #F59E0B, #EF4444)' : '#8B5CF6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h4 className="text-sm font-bold text-gray-300 mb-3">UP命中统计</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-pink-400">{stats.rateUpHits}</div>
              <div className="text-xs text-gray-500">UP命中次数</div>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">
                {stats.totalPulls > 0 ? ((stats.rateUpHits / stats.totalPulls) * 100).toFixed(1) : '0.0'}%
              </div>
              <div className="text-xs text-gray-500">UP命中率</div>
            </div>
          </div>
          <div className="mt-3 text-center p-3 bg-slate-700/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">
              {stats.pityTriggered > 0 ? Math.floor(stats.totalPulls / stats.pityTriggered) : '-'}
            </div>
            <div className="text-xs text-gray-500">平均保底间隔</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🎓</span> 学员招募
        </h2>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800/80 px-4 py-2 rounded-lg border border-purple-600/50">
            <span className="text-gray-400 text-sm">学员容量: </span>
            <span className="text-yellow-400 font-bold">{currentCount} / {capacity}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
        {([
          { key: 'pools', label: '🎴 卡池', icon: '' },
          { key: 'history', label: '📋 历史', icon: '' },
          { key: 'stats', label: '📊 统计', icon: '' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pools' && renderPoolsTab()}
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'stats' && renderStatsTab()}

      {showResults && recruitedResults.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-900 to-purple-950 rounded-xl border-2 border-yellow-500 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                <span>🎉</span> 招募完成！获得 {recruitedResults.length} 名学员
              </h3>
              <button
                onClick={() => {
                  setShowResults(false);
                  setRecruitedResults([]);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold"
              >
                确认
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {recruitedResults.some((r) => r.isPity) && (
                <span className="bg-orange-600/50 text-orange-300 px-3 py-1 rounded-lg text-sm font-bold">
                  🎯 保底触发!
                </span>
              )}
              {recruitedResults.some((r) => r.isRateUp) && (
                <span className="bg-pink-600/50 text-pink-300 px-3 py-1 rounded-lg text-sm font-bold">
                  🔥 UP命中!
                </span>
              )}
              {recruitedResults.some((r) => ['epic', 'legendary'].includes(r.student.rarity)) && (
                <span className="bg-purple-600/50 text-purple-300 px-3 py-1 rounded-lg text-sm font-bold animate-pulse">
                  ✨ 获得高级学员!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recruitedResults.map((r) => renderStudentCard(r.student, true, r.isPity, r.isRateUp))}
            </div>
          </div>
        </div>
      )}

      {promotionStudent && (
        <ClassPromotionModal
          student={promotionStudent}
          onClose={() => setPromotionStudent(null)}
        />
      )}
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center bg-slate-800/50 rounded px-1 py-0.5">
      <div className={`font-bold ${color}`}>{value}</div>
      <div className="text-gray-500 text-[10px]">{label}</div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-xl font-bold ${color}`}>{formatNumber(value)}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

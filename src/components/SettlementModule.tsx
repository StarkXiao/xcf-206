import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { BUILDING_DEFS, FATIGUE_CONFIG, ACTIVITY_NAMES, MASTERY_CONFIG, CLASS_DEFS, CLASS_TIER_COLORS } from '../data/gameData';
import { calculateTotalDailyOutput, calculateBuildingDailyOutput, formatNumber, calculateDailyFatigueRecovery } from '../utils/gameUtils';

interface Props {}

export function SettlementModule({}: Props) {
  const { state, dispatch, saveGame, calculateMasterySettlementBonus, calculateClassSettlementBonus } = useGame();
  const [showDetails, setShowDetails] = useState(false);
  const [settled, setSettled] = useState<number | null>(null);

  const dailyOutput = calculateTotalDailyOutput(state.buildings);
  const studentCount = state.students.length;
  const dailyUpkeep = {
    gold: studentCount * 10,
    mana: Math.floor(studentCount * 5),
  };

  const masteryBonus = useMemo(() => {
    let totalGold = 0;
    let totalExp = 0;
    let totalMana = 0;
    for (const student of state.students) {
      const bonus = calculateMasterySettlementBonus(student);
      totalGold += bonus.gold;
      totalExp += bonus.exp;
      totalMana += bonus.mana;
    }
    return { gold: totalGold, exp: totalExp, mana: totalMana };
  }, [state.students, calculateMasterySettlementBonus]);

  const classBonus = useMemo(() => {
    let totalGold = 0;
    let totalExp = 0;
    let totalMana = 0;
    for (const student of state.students) {
      const bonus = calculateClassSettlementBonus(student);
      totalGold += bonus.gold;
      totalExp += bonus.exp;
      totalMana += bonus.mana;
    }
    return { gold: totalGold, exp: totalExp, mana: totalMana };
  }, [state.students, calculateClassSettlementBonus]);

  const netOutput = {
    gold: dailyOutput.gold - dailyUpkeep.gold + masteryBonus.gold + classBonus.gold,
    mana: dailyOutput.mana - dailyUpkeep.mana + masteryBonus.mana + classBonus.mana,
    exp: dailyOutput.exp + masteryBonus.exp + classBonus.exp,
    crystals: dailyOutput.crystals,
    materials: dailyOutput.materials,
  };

  const scheduleEntries = state.schedule.entries;
  const completedSchedules = scheduleEntries.filter((e) => e.status === 'completed').length;
  const skippedSchedules = scheduleEntries.filter((e) => e.status === 'skipped').length;
  const pendingSchedules = scheduleEntries.filter((e) => !e.status || e.status === 'pending').length;
  const scheduleByActivity = scheduleEntries.filter((e) => e.status === 'completed').reduce((acc, e) => {
    acc[e.activity] = (acc[e.activity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const doSettlement = () => {
    if (!canSettle) return;

    dispatch({
      type: 'ADD_RESOURCES',
      resources: {
        gold: netOutput.gold,
        mana: netOutput.mana,
        exp: netOutput.exp,
        crystals: netOutput.crystals,
        materials: netOutput.materials,
      },
    });

    dispatch({
      type: 'UPDATE_ACADEMY_EXP',
      exp: state.students.length * 10,
    });

    dispatch({ type: 'NEW_DAY' });

    saveGame();
    setSettled(state.day);
    setTimeout(() => setSettled(null), 3000);
  };

  const canSettle = true;

  return (
    <div className="space-y-4">
      {settled !== null && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl shadow-2xl z-50 animate-pulse">
          <div className="text-center">
            <div className="text-2xl font-bold">🎉 第 {settled} 天结算完成！</div>
            <div className="text-sm mt-1">资源已发放，学员已恢复</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>💹</span> 资源结算
        </h2>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800/80 px-4 py-2 rounded-lg border border-green-600/50">
            <span className="text-gray-400 text-sm">当前: </span>
            <span className="text-green-400 font-bold text-lg">第 {state.day} 天</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/80 to-purple-900/40 rounded-xl border-2 border-green-500/50 p-6">
          <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <span>📊</span> 每日资源收支
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ResourceSummary
                label="金币"
                icon="💰"
                output={dailyOutput.gold}
                upkeep={dailyUpkeep.gold}
                net={netOutput.gold}
                color="yellow"
              />
              <ResourceSummary
                label="魔力"
                icon="💎"
                output={dailyOutput.mana}
                upkeep={dailyUpkeep.mana}
                net={netOutput.mana}
                color="blue"
              />
              <ResourceSummary
                label="经验"
                icon="⭐"
                output={dailyOutput.exp}
                upkeep={0}
                net={netOutput.exp}
                color="orange"
              />
              <ResourceSummary
                label="魔晶"
                icon="💠"
                output={dailyOutput.crystals}
                upkeep={0}
                net={netOutput.crystals}
                color="purple"
              />
              <ResourceSummary
                label="材料"
                icon="📦"
                output={dailyOutput.materials}
                upkeep={0}
                net={netOutput.materials}
                color="green"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-600">
              <div>
                <div className="text-gray-400 text-sm">学员维护费用</div>
                <div className="text-white font-bold">
                  {studentCount} 名学员 × 基础消耗
                </div>
              </div>
              <div className="text-right">
                <div className="text-red-400 font-bold">💰 -{formatNumber(dailyUpkeep.gold)}</div>
                <div className="text-cyan-400 font-bold">💎 -{formatNumber(dailyUpkeep.mana)}</div>
              </div>
            </div>

            {(masteryBonus.gold > 0 || masteryBonus.exp > 0 || masteryBonus.mana > 0) && (
              <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-purple-600/50">
                <div>
                  <div className="text-purple-400 text-sm">⭐ 专精加成</div>
                  <div className="text-white font-bold">
                    学员课程专精等级奖励
                  </div>
                </div>
                <div className="text-right">
                  {masteryBonus.gold > 0 && (
                    <div className="text-yellow-400 font-bold">💰 +{formatNumber(masteryBonus.gold)}</div>
                  )}
                  {masteryBonus.mana > 0 && (
                    <div className="text-blue-400 font-bold">💎 +{formatNumber(masteryBonus.mana)}</div>
                  )}
                  {masteryBonus.exp > 0 && (
                    <div className="text-green-400 font-bold">⭐ +{formatNumber(masteryBonus.exp)}</div>
                  )}
                </div>
              </div>
            )}

            {(classBonus.gold > 0 || classBonus.exp > 0 || classBonus.mana > 0) && (
              <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-orange-600/50">
                <div>
                  <div className="text-orange-400 text-sm">🏆 职业加成</div>
                  <div className="text-white font-bold">
                    学员职业等级奖励
                  </div>
                </div>
                <div className="text-right">
                  {classBonus.gold > 0 && (
                    <div className="text-yellow-400 font-bold">💰 +{formatNumber(classBonus.gold)}</div>
                  )}
                  {classBonus.mana > 0 && (
                    <div className="text-blue-400 font-bold">💎 +{formatNumber(classBonus.mana)}</div>
                  )}
                  {classBonus.exp > 0 && (
                    <div className="text-green-400 font-bold">⭐ +{formatNumber(classBonus.exp)}</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-600">
              <div>
                <div className="text-gray-400 text-sm">学员状态恢复</div>
                <div className="text-white font-bold">
                  生命值 +{10 + (state.buildings.find((b) => b.type === 'dormitory')?.level || 0) * 5} · 士气 +10
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold">
                  😴 疲劳 -{calculateDailyFatigueRecovery(state.buildings.find((b) => b.type === 'dormitory')?.level || 0)}
                </div>
              </div>
            </div>

            {scheduleEntries.length > 0 && (
              <div className="p-4 bg-slate-900/60 rounded-xl border border-cyan-600/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-gray-400 text-sm">今日排班执行</div>
                    <div className="text-white font-bold">
                      共 {scheduleEntries.length} 项安排
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 rounded bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-bold">
                      ✅ 完成 {completedSchedules}
                    </div>
                    {skippedSchedules > 0 && (
                      <div className="px-3 py-1 rounded bg-gray-500/20 border border-gray-500/50 text-gray-400 text-xs font-bold">
                        ⏭️ 错过 {skippedSchedules}
                      </div>
                    )}
                    {pendingSchedules > 0 && (
                      <div className="px-3 py-1 rounded bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-xs font-bold">
                        ⏳ 未执行 {pendingSchedules}
                      </div>
                    )}
                  </div>
                </div>
                {Object.keys(scheduleByActivity).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(scheduleByActivity).map(([activity, count]) => (
                      <div key={activity} className="px-2 py-1 rounded bg-slate-800 text-xs">
                        {ACTIVITY_NAMES[activity as keyof typeof ACTIVITY_NAMES]} × {count}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={doSettlement}
              disabled={!canSettle}
              className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-500 hover:via-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-green-500/30 transition-all active:scale-[0.98]"
            >
              ⏭️ 结算并进入第 {state.day + 1} 天
            </button>
            <p className="text-center text-gray-500 text-sm mt-2">
              结算后学员生命值和士气将得到恢复
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl border-2 border-yellow-500/50 p-5">
            <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <span>🏫</span> 学院概况
            </h3>
            <div className="space-y-3">
              <StatLine label="学院等级" value={`Lv.${state.academyLevel}`} icon="🏆" />
              <StatLine label="学院经验" value={`${formatNumber(state.academyExp)} / ${state.academyLevel * 500}`} icon="⭐" />
              <StatLine label="学员总数" value={`${studentCount} 人`} icon="👥" />
              <StatLine label="建筑数量" value={`${state.buildings.filter(b => b.constructed).length} / ${state.buildings.length}`} icon="🏛️" />
              <StatLine label="试炼次数" value={`${state.dungeonRuns} 次`} icon="⚔️" />
              <StatLine label="战斗胜利" value={`${state.totalVictories} 次`} icon="🏆" color="text-green-400" />
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-purple-600/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                <span>🏗️</span> 建筑产出明细
              </h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs bg-purple-700/50 hover:bg-purple-600/50 text-purple-300 px-2 py-1 rounded"
              >
                {showDetails ? '收起' : '展开'}
              </button>
            </div>

            {showDetails && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {state.buildings.map((building) => {
                  const def = BUILDING_DEFS[building.type];
                  const output = calculateBuildingDailyOutput(building);
                  const hasOutput = output.gold + output.mana + output.exp + output.crystals + output.materials > 0;
                  return (
                    <div
                      key={building.type}
                      className={`p-2 rounded-lg border ${
                        building.constructed ? 'bg-slate-900/50 border-slate-600' : 'bg-gray-800/20 border-gray-700 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{def.icon}</span>
                        <span className="text-white text-sm font-bold flex-1">{def.name}</span>
                        <span className="text-xs bg-yellow-700/50 text-yellow-300 px-1.5 py-0.5 rounded">
                          Lv.{building.level}
                        </span>
                      </div>
                      {hasOutput && (
                        <div className="flex flex-wrap gap-1 ml-8 text-xs">
                          {output.gold > 0 && <span className="text-yellow-400">💰+{output.gold}</span>}
                          {output.mana > 0 && <span className="text-blue-400">💎+{output.mana}</span>}
                          {output.exp > 0 && <span className="text-orange-400">⭐+{output.exp}</span>}
                          {output.crystals > 0 && <span className="text-purple-400">💠+{output.crystals}</span>}
                          {output.materials > 0 && <span className="text-green-400">📦+{output.materials}</span>}
                        </div>
                      )}
                      {!hasOutput && building.constructed && (
                        <div className="ml-8 text-xs text-gray-500">特殊效果建筑</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!showDetails && (
              <div className="text-sm text-gray-400 text-center py-2">
                点击「展开」查看各建筑的详细产出
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-cyan-500/50 p-5">
        <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
          <span>💡</span> 经营小贴士
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <TipCard icon="🏠" title="宿舍升级" desc="升级宿舍可增加学员上限和士气恢复速度" />
          <TipCard icon="📚" title="图书馆" desc="图书馆等级越高，课程获得的经验越多" />
          <TipCard icon="⚔️" title="训练场" desc="训练场提升学员攻击力和试炼奖励" />
          <TipCard icon="🗼" title="魔法塔" desc="高等级魔法塔提供大量魔力产出" />
          <TipCard icon="⚗️" title="炼金室" desc="炼金室是材料的重要来源" />
          <TipCard icon="🏛️" title="主教学楼" desc="其他建筑等级不能超过主教学楼等级" />
        </div>
      </div>
    </div>
  );
}

function ResourceSummary({
  label,
  icon,
  output,
  upkeep,
  net,
  color,
}: {
  label: string;
  icon: string;
  output: number;
  upkeep: number;
  net: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    yellow: 'from-yellow-900/50 to-yellow-700/30 border-yellow-500/50',
    blue: 'from-blue-900/50 to-cyan-700/30 border-blue-500/50',
    orange: 'from-orange-900/50 to-red-700/30 border-orange-500/50',
    purple: 'from-purple-900/50 to-pink-700/30 border-purple-500/50',
    green: 'from-green-900/50 to-emerald-700/30 border-green-500/50',
  };
  const textColorMap: Record<string, string> = {
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-xl p-3 border`}>
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-300 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${textColorMap[color]}`}>
        {net >= 0 ? '+' : ''}{formatNumber(net)}
      </div>
      <div className="mt-1 space-y-0.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-400">产出:</span>
          <span className="text-green-400">+{formatNumber(output)}</span>
        </div>
        {upkeep > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-400">消耗:</span>
            <span className="text-red-400">-{formatNumber(upkeep)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatLine({
  label,
  value,
  icon,
  color = 'text-white',
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

function TipCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 hover:border-cyan-500/50 transition-colors">
      <div className="flex items-start gap-2">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div>
          <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>
    </div>
  );
}

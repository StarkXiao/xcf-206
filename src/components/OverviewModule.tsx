import { useGame } from '../context/GameContext';
import { BUILDING_DEFS, RARITY_COLORS, ELEMENT_ICONS, ELEMENT_COLORS } from '../data/gameData';
import { AcademyMap } from './AcademyMap';
import { calculateTotalDailyOutput, formatNumber } from '../utils/gameUtils';
import { ModuleType } from '../types/game';

interface Props {
  onNavigate: (module: ModuleType) => void;
}

const QUICK_ACTIONS: Array<{
  module: ModuleType;
  icon: string;
  label: string;
  color: string;
}> = [
  { module: 'construction', icon: '🏗️', label: '学院建设', color: 'from-yellow-600 to-orange-600' },
  { module: 'recruitment', icon: '🎓', label: '学员招募', color: 'from-purple-600 to-pink-600' },
  { module: 'courses', icon: '📖', label: '课程安排', color: 'from-blue-600 to-cyan-600' },
  { module: 'dungeon', icon: '⚔️', label: '试炼副本', color: 'from-red-600 to-orange-600' },
  { module: 'settlement', icon: '💹', label: '每日结算', color: 'from-green-600 to-emerald-600' },
  { module: 'settings', icon: '⚙️', label: '设置存档', color: 'from-gray-600 to-slate-600' },
];

export function OverviewModule({ onNavigate }: Props) {
  const { state } = useGame();
  const dailyOutput = calculateTotalDailyOutput(state.buildings);
  const constructedBuildings = state.buildings.filter((b) => b.constructed);
  const idleStudents = state.students.filter((s) => s.status === 'idle');
  const studyingStudents = state.students.filter((s) => s.status === 'studying');
  const restingStudents = state.students.filter((s) => s.status === 'resting');
  const expNeeded = state.academyLevel * 500;
  const expPercent = (state.academyExp / expNeeded) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-purple-900/60 rounded-2xl border-2 border-purple-500/50 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 text-[200px] opacity-5 leading-none select-none pointer-events-none">
          🏰
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 mb-2">
                {state.academyName}
              </h1>
              <p className="text-purple-300 flex items-center gap-2">
                <span className="bg-purple-700/50 px-2 py-0.5 rounded">学院 Lv.{state.academyLevel}</span>
                <span>第 {state.day} 天</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">学院经验</div>
              <div className="text-lg font-bold text-yellow-400">
                {formatNumber(state.academyExp)} / {formatNumber(expNeeded)}
              </div>
              <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all"
                  style={{ width: `${Math.min(100, expPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox icon="🏛️" label="已建建筑" value={`${constructedBuildings.length}/${state.buildings.length}`} color="text-yellow-400" />
            <StatBox icon="👥" label="学员总数" value={`${state.students.length} 人`} color="text-blue-400" />
            <StatBox icon="⚔️" label="试炼战绩" value={`${state.totalVictories}/${state.dungeonRuns}`} color="text-red-400" />
            <StatBox icon="💰" label="每日收入" value={`+${formatNumber(dailyOutput.gold)}`} color="text-green-400" />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span>🗺️</span> 学院全景
        </h2>
        <AcademyMap buildings={state.buildings} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span>⚡</span> 快速入口
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.module}
              onClick={() => onNavigate(action.module)}
              className={`bg-gradient-to-br ${action.color} p-4 rounded-xl border-2 border-white/10 hover:border-white/30 hover:scale-[1.03] transition-all shadow-lg hover:shadow-xl`}
            >
              <div className="text-4xl mb-2 text-center">{action.icon}</div>
              <div className="text-center font-bold text-white text-sm">{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-purple-600/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>👥</span> 学员状态
            </h2>
            <button
              onClick={() => onNavigate('recruitment')}
              className="text-xs bg-purple-700/50 hover:bg-purple-600/50 text-purple-300 px-3 py-1 rounded"
            >
              查看全部 →
            </button>
          </div>

          {state.students.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/30 rounded-lg border-2 border-dashed border-purple-600/30">
              <div className="text-5xl mb-3">📚</div>
              <p className="text-purple-300 mb-1">学院还没有学员</p>
              <button
                onClick={() => onNavigate('recruitment')}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-bold text-sm hover:from-purple-500 hover:to-pink-500"
              >
                🎓 招募学员
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded">空闲 {idleStudents.length}</span>
                <span className="bg-blue-900/50 text-blue-400 px-2 py-1 rounded">学习中 {studyingStudents.length}</span>
                <span className="bg-orange-900/50 text-orange-400 px-2 py-1 rounded">休息中 {restingStudents.length}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {state.students.slice(0, 8).map((student) => (
                  <div
                    key={student.id}
                    className="bg-slate-900/50 rounded-lg p-2 border-l-4 hover:bg-slate-900/80 transition-colors"
                    style={{ borderLeftColor: RARITY_COLORS[student.rarity] }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{student.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{student.name.split('·')[0]}</div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span style={{ color: RARITY_COLORS[student.rarity] }}>Lv.{student.level}</span>
                          <span style={{ color: ELEMENT_COLORS[student.element] }}>{ELEMENT_ICONS[student.element]}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1">
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            student.stats.hp / student.stats.maxHp > 0.5
                              ? 'bg-green-500'
                              : student.stats.hp / student.stats.maxHp > 0.25
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${(student.stats.hp / student.stats.maxHp) * 100}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-gray-500 mt-0.5 flex justify-between">
                        <span>{student.status === 'idle' ? '空闲' : student.status === 'studying' ? '学习' : '休息'}</span>
                        <span>HP {Math.floor((student.stats.hp / student.stats.maxHp) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl border border-yellow-600/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                <span>🏗️</span> 主要建筑
              </h3>
              <button
                onClick={() => onNavigate('construction')}
                className="text-xs bg-yellow-700/30 hover:bg-yellow-600/30 text-yellow-300 px-2 py-1 rounded"
              >
                管理 →
              </button>
            </div>
            <div className="space-y-2">
              {state.buildings
                .filter((b) => b.constructed)
                .slice(0, 5)
                .map((building) => {
                  const def = BUILDING_DEFS[building.type];
                  return (
                    <div
                      key={building.type}
                      className="flex items-center gap-2 p-2 bg-slate-900/40 rounded-lg hover:bg-slate-900/60"
                    >
                      <span className="text-xl">{def.icon}</span>
                      <span className="text-white text-sm flex-1">{def.name}</span>
                      <span className="bg-yellow-700/50 text-yellow-300 px-2 py-0.5 rounded text-xs font-bold">
                        Lv.{building.level}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-xl border border-red-500/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <span>⚔️</span> 战斗准备
              </h3>
              <button
                onClick={() => onNavigate('dungeon')}
                className="text-xs bg-red-700/30 hover:bg-red-600/30 text-red-300 px-2 py-1 rounded"
              >
                挑战 →
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">可出战学员</span>
                <span className="text-green-400 font-bold">{idleStudents.length} 人</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">历史战绩</span>
                <span className="text-yellow-400 font-bold">
                  {state.totalVictories}胜 / {state.dungeonRuns}战
                </span>
              </div>
              {idleStudents.length > 0 ? (
                <button
                  onClick={() => onNavigate('dungeon')}
                  className="w-full mt-2 py-2 rounded-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-sm transition-all"
                >
                  ⚔️ 立即挑战副本
                </button>
              ) : (
                <p className="text-center text-xs text-gray-500 mt-2">暂无空闲学员可出战</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-cyan-500/30 p-5">
        <h2 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
          <span>💡</span> 今日推荐
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {idleStudents.length === 0 && state.students.length < 5 && (
            <ActionCard
              icon="🎓"
              title="招募新学员"
              desc="扩大你的学院规模"
              color="from-purple-600 to-pink-600"
              onClick={() => onNavigate('recruitment')}
            />
          )}
          {idleStudents.length > 0 && state.courses.length < 2 && (
            <ActionCard
              icon="📖"
              title="安排课程"
              desc="提升学员属性和等级"
              color="from-blue-600 to-cyan-600"
              onClick={() => onNavigate('courses')}
            />
          )}
          {constructedBuildings.length < state.buildings.length && (
            <ActionCard
              icon="🏗️"
              title="建造新建筑"
              desc="解锁更多学院功能"
              color="from-yellow-600 to-orange-600"
              onClick={() => onNavigate('construction')}
            />
          )}
          <ActionCard
            icon="💹"
            title="每日结算"
            desc="领取资源进入下一天"
            color="from-green-600 to-emerald-600"
            onClick={() => onNavigate('settlement')}
          />
          {idleStudents.length > 0 && (
            <ActionCard
              icon="⚔️"
              title="挑战试炼"
              desc="获取战斗经验和奖励"
              color="from-red-600 to-orange-600"
              onClick={() => onNavigate('dungeon')}
            />
          )}
          <ActionCard
            icon="💾"
            title="保存进度"
            desc="避免游戏进度丢失"
            color="from-slate-600 to-gray-600"
            onClick={() => onNavigate('settings')}
          />
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  color,
  onClick,
}: {
  icon: string;
  title: string;
  desc: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-r ${color} p-4 rounded-xl text-left hover:scale-[1.02] transition-all border border-white/10`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <div className="font-bold text-white">{title}</div>
          <div className="text-xs text-white/70 mt-0.5">{desc}</div>
        </div>
      </div>
    </button>
  );
}

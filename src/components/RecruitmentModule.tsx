import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Student } from '../types/game';
import { RARITY_COLORS, RARITY_NAMES, ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ICONS } from '../data/gameData';
import { generateStudent, formatNumber } from '../utils/gameUtils';

interface Props {}

const RECRUIT_COSTS = [
  { type: 'single', name: '单次招募', cost: { gold: 200, crystals: 0 }, count: 1 },
  { type: 'ten', name: '十连招募', cost: { gold: 1800, crystals: 1 }, count: 10 },
  { type: 'premium', name: '高级招募', cost: { gold: 0, crystals: 10 }, count: 1, guaranteed: 'rare' as const },
];

export function RecruitmentModule({}: Props) {
  const { state, dispatch, getStudentCapacity, canAfford } = useGame();
  const [recruitedStudents, setRecruitedStudents] = useState<Student[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isRecruiting, setIsRecruiting] = useState(false);

  const capacity = getStudentCapacity();
  const currentCount = state.students.length;

  const handleRecruit = (recruitType: (typeof RECRUIT_COSTS)[number]) => {
    if (isRecruiting) return;
    if (!canAfford(recruitType.cost)) return;
    const availableSlots = capacity - currentCount - recruitedStudents.length;
    const actualCount = Math.min(recruitType.count, availableSlots);
    if (actualCount <= 0) {
      alert('学员容量已满！请升级宿舍或解雇学员。');
      return;
    }

    setIsRecruiting(true);
    dispatch({ type: 'SPEND_RESOURCES', resources: recruitType.cost });

    setTimeout(() => {
      const newStudents: Student[] = [];
      for (let i = 0; i < actualCount; i++) {
        let student = generateStudent();
        if (
          recruitType.guaranteed &&
          i === actualCount - 1 &&
          ['common', 'uncommon'].includes(student.rarity)
        ) {
          do {
            student = generateStudent();
          } while (['common', 'uncommon'].includes(student.rarity));
        }
        newStudents.push(student);
        dispatch({ type: 'ADD_STUDENT', student });
      }
      setRecruitedStudents((prev) => [...prev, ...newStudents]);
      setShowResults(true);
      setIsRecruiting(false);
    }, 800);
  };

  const handleDismiss = (studentId: string) => {
    if (confirm('确定要解雇这名学员吗？')) {
      dispatch({ type: 'REMOVE_STUDENT', studentId });
      setRecruitedStudents((prev) => prev.filter((s) => s.id !== studentId));
    }
  };

  const renderStudentCard = (student: Student, isNew: boolean = false) => (
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
          {isNew && (
            <span className="bg-green-500 px-2 py-0.5 rounded text-xs text-white font-bold animate-bounce">
              NEW!
            </span>
          )}
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
          </div>
          <button
            onClick={() => handleDismiss(student.id)}
            className="text-xs bg-red-900/50 hover:bg-red-800 text-red-400 px-2 py-0.5 rounded border border-red-700/50"
          >
            解雇
          </button>
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
            <span className="text-yellow-400 font-bold">
              {currentCount} / {capacity}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RECRUIT_COSTS.map((recruit) => {
          const affordable = canAfford(recruit.cost);
          const hasSlots = currentCount < capacity;
          const disabled = !affordable || !hasSlots || isRecruiting;
          return (
            <div
              key={recruit.type}
              className={`relative p-5 rounded-xl border-2 transition-all overflow-hidden ${
                disabled
                  ? 'border-gray-700 bg-gray-800/30 opacity-60'
                  : 'border-purple-600 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20'
              }`}
            >
              {recruit.guaranteed && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 rounded text-xs text-white font-bold">
                  保底稀有+
                </div>
              )}
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">
                  {recruit.type === 'single' ? '🎫' : recruit.type === 'ten' ? '🎟️' : '💎'}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{recruit.name}</h3>
                <p className="text-purple-300 text-sm">招募 {recruit.count} 名学员</p>
              </div>

              <div className="flex justify-center gap-3 mb-4">
                {recruit.cost.gold > 0 && (
                  <span
                    className={`px-3 py-1 rounded-lg font-bold ${
                      state.resources.gold >= recruit.cost.gold
                        ? 'bg-yellow-900/50 text-yellow-300'
                        : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    💰 {formatNumber(recruit.cost.gold)}
                  </span>
                )}
                {recruit.cost.crystals > 0 && (
                  <span
                    className={`px-3 py-1 rounded-lg font-bold ${
                      state.resources.crystals >= recruit.cost.crystals
                        ? 'bg-purple-900/50 text-purple-300'
                        : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    💠 {formatNumber(recruit.cost.crystals)}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleRecruit(recruit)}
                disabled={disabled}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                  disabled
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white shadow-lg hover:shadow-orange-500/30 active:scale-95'
                }`}
              >
                {isRecruiting ? '✨ 召唤中...' : !hasSlots ? '容量已满' : !affordable ? '资源不足' : '✨ 开始招募'}
              </button>
            </div>
          );
        })}
      </div>

      {state.students.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <span>👥</span> 我的学员 ({state.students.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {state.students.map((s) =>
              renderStudentCard(s, recruitedStudents.some((rs) => rs.id === s.id))
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

      {showResults && recruitedStudents.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-900 to-purple-950 rounded-xl border-2 border-yellow-500 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                <span>🎉</span> 招募完成！获得 {recruitedStudents.length} 名学员
              </h3>
              <button
                onClick={() => {
                  setShowResults(false);
                  setRecruitedStudents([]);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold"
              >
                确认
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recruitedStudents.map((s) => renderStudentCard(s, true))}
            </div>
          </div>
        </div>
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

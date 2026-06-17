import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Student, StudentClass, ClassDef } from '../types/game';
import {
  CLASS_DEFS,
  CLASS_TIER_NAMES,
  CLASS_TIER_COLORS,
  MASTERY_CONFIG,
  COURSE_DEFS,
  RARITY_COLORS,
  ELEMENT_COLORS,
  ELEMENT_ICONS,
} from '../data/gameData';
import { formatNumber } from '../utils/gameUtils';

interface Props {
  student: Student;
  onClose: () => void;
}

export function ClassPromotionModal({ student, onClose }: Props) {
  const { state, getAvailablePromotions, canPromoteToClass, promoteStudent, canAfford, getStudentMastery } = useGame();
  const [selectedClass, setSelectedClass] = useState<StudentClass | null>(null);
  const [promoting, setPromoting] = useState(false);

  const availableClasses = getAvailablePromotions(student.id);
  const currentClassDef = CLASS_DEFS[student.class];

  const handlePromote = () => {
    if (!selectedClass || promoting) return;
    const targetClass = CLASS_DEFS[selectedClass];
    if (!targetClass) return;

    if (!canAfford({ gold: targetClass.goldCost, crystals: targetClass.crystalsCost })) {
      return;
    }

    setPromoting(true);
    setTimeout(() => {
      promoteStudent(student.id, selectedClass);
      setPromoting(false);
      onClose();
    }, 800);
  };

  const renderRequirementItem = (text: string, satisfied: boolean) => (
    <div className={`flex items-center gap-2 text-xs ${satisfied ? 'text-green-400' : 'text-red-400'}`}>
      <span>{satisfied ? '✓' : '✗'}</span>
      <span>{text}</span>
    </div>
  );

  const renderClassCard = (classDef: ClassDef) => {
    const { canPromote, reasons } = canPromoteToClass(student.id, classDef.id);
    const canAffordCost = canAfford({ gold: classDef.goldCost, crystals: classDef.crystalsCost });
    const isSelected = selectedClass === classDef.id;

    return (
      <button
        key={classDef.id}
        onClick={() => setSelectedClass(classDef.id)}
        disabled={promoting}
        className={`relative p-4 rounded-xl border-2 transition-all text-left ${
          isSelected
            ? 'border-yellow-400 bg-yellow-900/30 shadow-lg shadow-yellow-500/20'
            : canPromote && canAffordCost
            ? 'border-green-500/50 bg-green-900/20 hover:border-green-400'
            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
        }`}
      >
        {(canPromote && canAffordCost) && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
            可转职
          </div>
        )}

        <div className="flex items-start gap-3 mb-3">
          <span className="text-4xl">{classDef.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-white text-lg">{classDef.name}</h4>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-bold"
                style={{
                  background: CLASS_TIER_COLORS[classDef.tier] + '30',
                  color: CLASS_TIER_COLORS[classDef.tier],
                }}
              >
                {CLASS_TIER_NAMES[classDef.tier]}
              </span>
            </div>
            <p className="text-xs text-gray-400">{classDef.description}</p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {renderRequirementItem(
            `等级 Lv.${classDef.requiredLevel}`,
            student.level >= classDef.requiredLevel
          )}
          {classDef.requiredMasteries.map((req) => {
            const mastery = getStudentMastery(student.id, req.courseType);
            const masteryIndex = ['novice', 'apprentice', 'adept', 'expert', 'master', 'grandmaster'].indexOf(req.level);
            const currentIndex = ['novice', 'apprentice', 'adept', 'expert', 'master', 'grandmaster'].indexOf(mastery.level);
            return renderRequirementItem(
              `${COURSE_DEFS[req.courseType]?.name || req.courseType} ${MASTERY_CONFIG.names[req.level]}`,
              currentIndex >= masteryIndex
            );
          })}
          {Object.entries(classDef.requiredStats).map(([stat, val]) => {
            const current = student.stats[stat as keyof typeof student.stats];
            const statName =
              stat === 'maxHp' ? '生命值' :
              stat === 'attack' ? '攻击' :
              stat === 'defense' ? '防御' :
              stat === 'magic' ? '魔法' :
              stat === 'speed' ? '速度' :
              stat === 'critRate' ? '暴击率' : '暴击伤害';
            return renderRequirementItem(
              `${statName} ${val}`,
              current >= (val as number)
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="text-xs">
            <span className="text-yellow-400 mr-2">💰 {formatNumber(classDef.goldCost)}</span>
            <span className="text-purple-400">💎 {classDef.crystalsCost}</span>
          </div>
          {!canAffordCost && (
            <span className="text-xs text-red-400">资源不足</span>
          )}
        </div>

        {isSelected && (
          <div className="mt-3 pt-3 border-t border-yellow-500/30">
            <div className="text-xs text-gray-400 mb-2">转职后获得:</div>
            <div className="flex flex-wrap gap-1">
              {classDef.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded border border-cyan-600/50"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              {Object.entries(classDef.statGrowth).map(([stat, val]) => {
                const statName =
                  stat === 'maxHp' ? 'HP' :
                  stat === 'attack' ? '攻' :
                  stat === 'defense' ? '防' :
                  stat === 'magic' ? '魔' :
                  stat === 'speed' ? '速' :
                  stat === 'critRate' ? '暴率' : '暴伤';
                return (
                  <span key={stat} className="text-green-400">
                    {statName} +{val}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border-2 border-purple-500/50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-purple-500/30">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{student.avatar}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{student.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs px-2 py-0.5 rounded font-bold"
                  style={{ background: RARITY_COLORS[student.rarity] + '30', color: RARITY_COLORS[student.rarity] }}
                >
                  Lv.{student.level}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: ELEMENT_COLORS[student.element] + '30', color: ELEMENT_COLORS[student.element] }}
                >
                  {ELEMENT_ICONS[student.element]}
                </span>
                {currentClassDef && (
                  <span
                    className="text-xs px-2 py-0.5 rounded font-bold"
                    style={{
                      background: CLASS_TIER_COLORS[currentClassDef.tier] + '30',
                      color: CLASS_TIER_COLORS[currentClassDef.tier],
                    }}
                  >
                    {currentClassDef.icon} {currentClassDef.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={promoting}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {availableClasses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <p className="text-gray-300 text-lg mb-2">当前暂无可转职职业</p>
              <p className="text-gray-500 text-sm">
                继续提升学员等级和课程专精等级，解锁更多职业选项
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>⭐</span> 可转职职业
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableClasses.map((classDef) => renderClassCard(classDef))}
              </div>
            </div>
          )}
        </div>

        {availableClasses.length > 0 && (
          <div className="p-5 border-t border-purple-500/30 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedClass
                ? `已选择: ${CLASS_DEFS[selectedClass]?.icon} ${CLASS_DEFS[selectedClass]?.name}`
                : '请选择要转职的职业'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={promoting}
                className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePromote}
                disabled={!selectedClass || promoting || (selectedClass !== null && !canPromoteToClass(student.id, selectedClass).canPromote) || (selectedClass !== null && !canAfford({ gold: CLASS_DEFS[selectedClass]?.goldCost || 0, crystals: CLASS_DEFS[selectedClass]?.crystalsCost || 0 }))}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30"
              >
                {promoting ? '转职中...' : '✨ 确认转职'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { BOND_PAIR_DEFS, BOND_LEVEL_NAMES, BOND_LEVEL_COLORS, BOND_LEVEL_ICONS, RARITY_COLORS, RARITY_NAMES, ELEMENT_ICONS, ELEMENT_COLORS } from '../data/gameData';
import { BondRelation, Student } from '../types/game';
import { getBondLevelIndex } from '../utils/gameUtils';

export function BondPanel() {
  const { state, getStudentBonds, getBondRelation, calculateBondBonuses, findMatchingBondPairs, getStudentBondCount } = useGame();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(state.students[0]?.id || null);
  const [selectedBond, setSelectedBond] = useState<BondRelation | null>(null);

  const selectedStudent = useMemo(
    () => state.students.find((s) => s.id === selectedStudentId) || null,
    [state.students, selectedStudentId]
  );

  const studentBonds = useMemo(() => {
    if (!selectedStudentId) return [];
    return getStudentBonds(selectedStudentId);
  }, [selectedStudentId, getStudentBonds, state.bonds]);

  const availableBondPairs = useMemo(() => {
    if (!selectedStudentId) return [];
    const pairs: Array<{ pair: typeof BOND_PAIR_DEFS[keyof typeof BOND_PAIR_DEFS]; otherStudent: Student | null; isFormed: boolean }> = [];
    
    for (const pair of Object.values(BOND_PAIR_DEFS)) {
      const s1 = state.students.find(s => s.id === pair.student1Id);
      const s2 = state.students.find(s => s.id === pair.student2Id);
      
      let otherStudent: Student | null = null;
      let isMatch = false;
      
      if (pair.student1Id === selectedStudentId && s2) {
        otherStudent = s2;
        isMatch = true;
      } else if (pair.student2Id === selectedStudentId && s1) {
        otherStudent = s1;
        isMatch = true;
      } else if (s1 && s2) {
        const matches = findMatchingBondPairs(selectedStudentId, s1.id);
        if (matches.some(m => m.id === pair.id)) {
          otherStudent = s1;
          isMatch = true;
        }
      }
      
      if (isMatch) {
        const isFormed = state.bonds.some(b =>
          (b.studentId1 === selectedStudentId && b.studentId2 === otherStudent?.id) ||
          (b.studentId1 === otherStudent?.id && b.studentId2 === selectedStudentId)
        );
        pairs.push({ pair, otherStudent, isFormed });
      }
    }
    
    return pairs;
  }, [selectedStudentId, state.students, state.bonds, findMatchingBondPairs]);

  const bondBonuses = useMemo(() => {
    if (!selectedStudentId) return null;
    return calculateBondBonuses(selectedStudentId);
  }, [selectedStudentId, calculateBondBonuses, state.bonds]);

  const getBondPairForBond = (bond: BondRelation) => {
    const student1 = state.students.find(s => s.id === bond.studentId1);
    const student2 = state.students.find(s => s.id === bond.studentId2);
    if (!student1 || !student2) return null;
    const pairs = findMatchingBondPairs(bond.studentId1, bond.studentId2);
    return pairs.length > 0 ? pairs[0] : null;
  };

  const getOtherStudent = (bond: BondRelation): Student | undefined => {
    if (bond.studentId1 === selectedStudentId) {
      return state.students.find(s => s.id === bond.studentId2);
    }
    return state.students.find(s => s.id === bond.studentId1);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-900/60 via-rose-900/60 to-pink-900/60 rounded-2xl border-2 border-pink-500/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">💞</span>
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">
              羁绊系统
            </h2>
            <p className="text-pink-300 text-sm">学员之间的羁绊越深，获得的加成越多</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-pink-300">{state.bonds.length}</div>
            <div className="text-xs text-gray-400">总羁绊数</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-rose-300">{state.totalBondsFormed}</div>
            <div className="text-xs text-gray-400">累计缔结</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-red-300">
              {state.bonds.filter(b => getBondLevelIndex(b.level) >= 2).length}
            </div>
            <div className="text-xs text-gray-400">朋友及以上</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-yellow-300">
              {state.bonds.filter(b => b.level === 'soulmate').length}
            </div>
            <div className="text-xs text-gray-400">灵魂羁绊</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>👥</span> 选择学员
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {state.students.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  setSelectedStudentId(student.id);
                  setSelectedBond(null);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedStudentId === student.id
                    ? 'bg-gradient-to-r from-pink-600/50 to-rose-600/50 border-2 border-pink-400/50'
                    : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${ELEMENT_COLORS[student.element] || 'bg-gray-600'}`}>
                  {ELEMENT_ICONS[student.element] || '❓'}
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-bold text-sm ${RARITY_COLORS[student.rarity] || 'text-gray-300'}`}>
                    {student.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Lv.{student.level} · {RARITY_NAMES[student.rarity]}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-pink-400 text-sm font-bold">
                    {BOND_LEVEL_ICONS[getStudentBondCount(student.id) >= 5 ? 'soulmate' : 'friend'] || '💗'} {getStudentBondCount(student.id)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>💗</span> 已缔结羁绊
          </h3>
          {studentBonds.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">💭</div>
              <p>暂无羁绊关系</p>
              <p className="text-sm mt-1">让学员一起上课或组队冒险吧</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {studentBonds.map((bond) => {
                const otherStudent = getOtherStudent(bond);
                const bondPair = getBondPairForBond(bond);
                const expPercent = (bond.exp / bond.expToNext) * 100;
                const levelColor = BOND_LEVEL_COLORS[bond.level] || 'text-gray-400';
                
                return (
                  <button
                    key={bond.id}
                    onClick={() => setSelectedBond(bond)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      selectedBond?.id === bond.id
                        ? 'bg-gradient-to-r from-pink-600/30 to-rose-600/30 border-2 border-pink-400/50'
                        : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl ${levelColor}`}>
                        {BOND_LEVEL_ICONS[bond.level] || '💗'}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {otherStudent?.name || '未知'}
                          {bondPair && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">
                              {bondPair.name}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${levelColor}`}>
                          {BOND_LEVEL_NAMES[bond.level]}
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all"
                        style={{ width: `${Math.min(100, expPercent)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex justify-between">
                      <span>经验: {bond.exp}/{bond.expToNext}</span>
                      <span>互动: {bond.totalInteractions}次</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-5">
          {selectedBond ? (
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📜</span> 羁绊详情
              </h3>
              {(() => {
                const otherStudent = getOtherStudent(selectedBond);
                const bondPair = getBondPairForBond(selectedBond);
                const expPercent = (selectedBond.exp / selectedBond.expToNext) * 100;
                const levelColor = BOND_LEVEL_COLORS[selectedBond.level] || 'text-gray-400';
                
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4 py-4">
                      {selectedStudent && (
                        <div className="text-center">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-1 ${ELEMENT_COLORS[selectedStudent.element] || 'bg-gray-600'}`}>
                            {ELEMENT_ICONS[selectedStudent.element] || '❓'}
                          </div>
                          <div className={`text-sm font-bold ${RARITY_COLORS[selectedStudent.rarity]}`}>
                            {selectedStudent.name}
                          </div>
                        </div>
                      )}
                      <div className={`text-3xl ${levelColor}`}>
                        {BOND_LEVEL_ICONS[selectedBond.level] || '💗'}
                      </div>
                      {otherStudent && (
                        <div className="text-center">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-1 ${ELEMENT_COLORS[otherStudent.element] || 'bg-gray-600'}`}>
                            {ELEMENT_ICONS[otherStudent.element] || '❓'}
                          </div>
                          <div className={`text-sm font-bold ${RARITY_COLORS[otherStudent.rarity]}`}>
                            {otherStudent.name}
                          </div>
                        </div>
                      )}
                    </div>

                    {bondPair && (
                      <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 rounded-xl p-4 border border-yellow-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{bondPair.icon}</span>
                          <div>
                            <div className={`font-bold ${RARITY_COLORS[bondPair.rarity] || 'text-white'}`}>
                              {bondPair.name}
                            </div>
                            <div className="text-xs text-gray-400">{RARITY_NAMES[bondPair.rarity]}羁绊</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300">{bondPair.description}</p>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold ${levelColor}`}>
                          {BOND_LEVEL_NAMES[selectedBond.level]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {selectedBond.exp} / {selectedBond.expToNext} EXP
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all"
                          style={{ width: `${Math.min(100, expPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-xl p-3">
                      <div className="text-sm font-bold text-white mb-2">当前加成</div>
                      <div className="space-y-1">
                        {bondPair?.bonuses
                          .filter(b => getBondLevelIndex(selectedBond.level) >= getBondLevelIndex(b.level))
                          .map((bonus, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-300">{bonus.description}</span>
                              <span className="text-green-400">✓ 已解锁</span>
                            </div>
                          ))}
                        {bondPair?.bonuses
                          .filter(b => getBondLevelIndex(selectedBond.level) < getBondLevelIndex(b.level))
                          .map((bonus, idx) => (
                            <div key={idx} className="flex justify-between text-sm opacity-50">
                              <span className="text-gray-400">{bonus.description}</span>
                              <span className="text-gray-500">
                                {BOND_LEVEL_NAMES[bonus.level]}解锁
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-sm">
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="text-pink-400 font-bold">{selectedBond.totalInteractions}</div>
                        <div className="text-gray-400 text-xs">互动次数</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="text-rose-400 font-bold">
                          {selectedBond.lastInteractionTime ? new Date(selectedBond.lastInteractionTime).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-gray-400 text-xs">最近互动</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : bondBonuses && selectedStudent ? (
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>✨</span> 羁绊加成总览
              </h3>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-pink-900/30 to-rose-900/30 rounded-xl p-4 border border-pink-500/30">
                  <div className="text-sm font-bold text-pink-300 mb-2">{selectedStudent.name} 的羁绊加成</div>
                  <div className="space-y-2">
                    {Object.entries(bondBonuses.statBonuses).map(([stat, value]) => (
                      value !== 0 && (
                        <div key={stat} className="flex justify-between text-sm">
                          <span className="text-gray-300">
                            {stat === 'attack' && '攻击力'}
                            {stat === 'defense' && '防御力'}
                            {stat === 'magic' && '魔法力'}
                            {stat === 'speed' && '速度'}
                            {stat === 'maxHp' && '最大生命'}
                            {stat === 'critRate' && '暴击率'}
                            {stat === 'critDamage' && '暴击伤害'}
                          </span>
                          <span className="text-green-400">+{value}</span>
                        </div>
                      )
                    ))}
                    {bondBonuses.expBonus !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">经验获取</span>
                        <span className="text-green-400">+{bondBonuses.expBonus}%</span>
                      </div>
                    )}
                    {bondBonuses.goldBonus !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">金币获取</span>
                        <span className="text-green-400">+{bondBonuses.goldBonus}%</span>
                      </div>
                    )}
                    {bondBonuses.dropRateBonus !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">掉落率</span>
                        <span className="text-green-400">+{bondBonuses.dropRateBonus}%</span>
                      </div>
                    )}
                    {bondBonuses.moraleBonus !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">士气加成</span>
                        <span className="text-green-400">+{bondBonuses.moraleBonus}</span>
                      </div>
                    )}
                    {bondBonuses.fatigueRecoveryBonus !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">疲劳恢复</span>
                        <span className="text-green-400">+{bondBonuses.fatigueRecoveryBonus}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-400 text-center py-2">
                  点击左侧羁绊查看详情
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">💝</div>
              <p>选择一名学员查看羁绊</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📖</span> 可缔结羁绊图鉴
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(BOND_PAIR_DEFS).map((pair) => {
            const s1 = state.students.find(s => s.id === pair.student1Id);
            const s2 = state.students.find(s => s.id === pair.student2Id);
            const hasBothStudents = s1 && s2;
            const isFormed = hasBothStudents && state.bonds.some(b =>
              (b.studentId1 === pair.student1Id && b.studentId2 === pair.student2Id) ||
              (b.studentId1 === pair.student2Id && b.studentId2 === pair.student1Id)
            );
            const bondLevel = isFormed 
              ? (state.bonds.find(b =>
                  (b.studentId1 === pair.student1Id && b.studentId2 === pair.student2Id) ||
                  (b.studentId1 === pair.student2Id && b.studentId2 === pair.student1Id)
                )?.level || 'stranger')
              : 'stranger';

            return (
              <div
                key={pair.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isFormed
                    ? `bg-gradient-to-br from-pink-900/30 to-rose-900/30 border-pink-500/50`
                    : hasBothStudents
                    ? 'bg-slate-700/50 border-slate-600'
                    : 'bg-slate-800/50 border-slate-700/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    isFormed ? 'bg-pink-500/30' : 'bg-slate-600/50'
                  }`}>
                    {pair.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-bold ${RARITY_COLORS[pair.rarity] || 'text-white'}`}>
                      {pair.name}
                    </div>
                    <div className="text-xs text-gray-400">{RARITY_NAMES[pair.rarity]}羁绊</div>
                  </div>
                  {isFormed && (
                    <div className={`text-sm font-bold ${BOND_LEVEL_COLORS[bondLevel]}`}>
                      {BOND_LEVEL_ICONS[bondLevel]} {BOND_LEVEL_NAMES[bondLevel]}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-300 mb-3">{pair.description}</p>
                
                <div className="flex items-center justify-center gap-2 mb-3">
                  {s1 ? (
                    <div className="flex items-center gap-1">
                      <span className={`text-sm ${RARITY_COLORS[s1.rarity]}`}>{s1.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">???</span>
                  )}
                  <span className="text-pink-400">💕</span>
                  {s2 ? (
                    <div className="flex items-center gap-1">
                      <span className={`text-sm ${RARITY_COLORS[s2.rarity]}`}>{s2.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">???</span>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  已解锁 {pair.bonuses.filter(b => getBondLevelIndex(bondLevel) >= getBondLevelIndex(b.level)).length}/{pair.bonuses.length} 个加成
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

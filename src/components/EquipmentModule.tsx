import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { RARITY_COLORS, RARITY_NAMES, EQUIPMENT_DEFS, POTION_DEFS, EQUIPMENT_SLOT_ICONS, EQUIPMENT_SLOT_NAMES } from '../data/gameData';
import { Equipment, Potion, EquipmentSlot, Student } from '../types/game';
import { formatNumber, calculateStudentStats } from '../utils/gameUtils';

type TabType = 'equipment' | 'potions' | 'inventory';
type FilterType = 'all' | 'weapon' | 'armor' | 'accessory' | 'relic';

const STAT_LABELS: Record<string, string> = {
  maxHp: '最大生命',
  attack: '攻击力',
  defense: '防御力',
  magic: '魔法力',
  speed: '速度',
  critRate: '暴击率',
  critDamage: '暴击伤害',
};

export function EquipmentModule() {
  const { state, equipItem, unequipItem, usePotion } = useGame();
  const [activeTab, setActiveTab] = useState<TabType>('equipment');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(state.students[0]?.id || null);
  const [equipmentFilter, setEquipmentFilter] = useState<FilterType>('all');
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Equipment | Potion | null>(null);

  const selectedStudent = useMemo(
    () => state.students.find((s) => s.id === selectedStudentId) || null,
    [state.students, selectedStudentId]
  );

  const calculatedStats = useMemo(() => {
    if (!selectedStudent) return null;
    return calculateStudentStats(selectedStudent, state.equipment, state.potions);
  }, [selectedStudent, state.equipment, state.potions]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEquip = (item: Equipment) => {
    if (!selectedStudent) {
      showNotification('⚠️ 请先选择学员');
      return;
    }
    if (item.equippedBy) {
      showNotification('⚠️ 该装备已被其他学员佩戴');
      return;
    }
    equipItem(selectedStudent.id, item.id, item.slot);
    const def = EQUIPMENT_DEFS[item.defId];
    showNotification(`✨ 已为 ${selectedStudent.name} 装备 ${def?.name}`);
  };

  const handleUnequip = (slot: EquipmentSlot) => {
    if (!selectedStudent) return;
    const itemId = selectedStudent.equipment[slot];
    if (!itemId) return;
    unequipItem(selectedStudent.id, slot);
    showNotification('🔧 已卸下装备');
  };

  const handleUsePotion = (potion: Potion) => {
    if (!selectedStudent) {
      showNotification('⚠️ 请先选择学员');
      return;
    }
    if (potion.isUsed) {
      showNotification('⚠️ 该药剂已被使用');
      return;
    }
    usePotion(selectedStudent.id, potion.id);
    const def = POTION_DEFS[potion.defId];
    showNotification(`🧪 已为 ${selectedStudent.name} 使用 ${def?.name}`);
  };

  const filteredEquipment = useMemo(() => {
    if (equipmentFilter === 'all') return state.equipment;
    return state.equipment.filter((e) => e.slot === equipmentFilter);
  }, [state.equipment, equipmentFilter]);

  const renderStatsComparison = () => {
    if (!selectedStudent || !calculatedStats) return null;

    const statKeys = ['maxHp', 'attack', 'defense', 'magic', 'speed', 'critRate', 'critDamage'] as const;

    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
          <span>📊</span> 属性详情
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {statKeys.map((key) => {
            const base = selectedStudent.baseStats[key] || 0;
            const final = calculatedStats[key] || 0;
            const diff = final - base;
            const showDiff = diff !== 0;

            return (
              <div key={key} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                <span className="text-gray-400 text-sm">{STAT_LABELS[key]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{base}</span>
                  {showDiff && (
                    <>
                      <span className="text-gray-600">→</span>
                      <span className="text-yellow-400 font-bold">{final}</span>
                      <span className={`text-xs font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {diff > 0 ? '+' : ''}
                        {diff}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEquipmentSlots = () => {
    if (!selectedStudent) return null;

    const slots: EquipmentSlot[] = ['weapon', 'armor', 'accessory', 'relic'];

    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
          <span>⚔️</span> 装备栏
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {slots.map((slot) => {
            const itemId = selectedStudent.equipment[slot];
            const item = itemId ? state.equipment.find((e) => e.id === itemId) : null;
            const def = item ? EQUIPMENT_DEFS[item.defId] : null;

            return (
              <div
                key={slot}
                onClick={() => item && setSelectedItem(item)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  item
                    ? def
                      ? `border-${RARITY_COLORS[def.rarity].replace('#', '')}/50 hover:border-${RARITY_COLORS[def.rarity].replace('#', '')} cursor-pointer`
                      : 'border-slate-600 cursor-pointer'
                    : 'border-dashed border-slate-600 hover:border-slate-500'
                } bg-slate-700/30`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{EQUIPMENT_SLOT_ICONS[slot]}</span>
                  <span className="text-sm text-gray-400">{EQUIPMENT_SLOT_NAMES[slot]}</span>
                </div>
                {item && def ? (
                  <div>
                    <div
                      className="font-bold text-sm truncate"
                      style={{ color: RARITY_COLORS[def.rarity] }}
                    >
                      {def.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">+{item.level} 强化</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnequip(slot);
                      }}
                      className="mt-2 w-full py-1 text-xs bg-red-900/50 text-red-400 rounded hover:bg-red-800/50 transition-all"
                    >
                      卸下
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm">未装备</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActivePotions = () => {
    if (!selectedStudent) return null;

    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
          <span>🧪</span> 生效药剂
        </h4>
        {selectedStudent.activePotions.length === 0 ? (
          <div className="text-gray-600 text-sm text-center py-4">暂未使用药剂</div>
        ) : (
          <div className="space-y-2">
            {selectedStudent.activePotions.map((potionId) => {
              const potion = state.potions.find((p) => p.id === potionId);
              if (!potion) return null;
              const def = POTION_DEFS[potion.defId];
              if (!def) return null;

              const remaining = potion.endTime ? Math.max(0, potion.endTime - Date.now()) : 0;
              const minutes = Math.floor(remaining / 60000);
              const seconds = Math.floor((remaining % 60000) / 1000);

              return (
                <div
                  key={potionId}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{def.icon}</span>
                    <div>
                      <div
                        className="font-bold text-sm"
                        style={{ color: RARITY_COLORS[def.rarity] }}
                      >
                        {def.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {def.effectType === 'buff'
                          ? `攻击+${def.effectValue}%`
                          : `生命+${def.effectValue}%`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-orange-400 font-bold text-sm">
                      {minutes}:{seconds.toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500">剩余时间</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderEquipmentCard = (item: Equipment) => {
    const def = EQUIPMENT_DEFS[item.defId];
    if (!def) return null;
    const isEquipped = !!item.equippedBy;
    const equipper = isEquipped ? state.students.find((s) => s.id === item.equippedBy) : null;

    return (
      <div
        key={item.id}
        onClick={() => setSelectedItem(item)}
        className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
          selectedItem?.id === item.id
            ? 'border-yellow-400 bg-yellow-900/20 scale-[1.02]'
            : 'border-slate-600 bg-slate-800/50 hover:border-purple-400'
        } ${isEquipped ? 'opacity-70' : ''}`}
      >
        <div className="flex items-start gap-2 mb-2">
          <span className="text-3xl">{def.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span
                className="font-bold text-sm truncate"
                style={{ color: RARITY_COLORS[def.rarity] }}
              >
                {def.name}
              </span>
              <span className="text-xs text-gray-500">+{item.level}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {EQUIPMENT_SLOT_ICONS[def.slot]} {EQUIPMENT_SLOT_NAMES[def.slot]}
            </div>
          </div>
        </div>

        <div className="space-y-1 mb-2">
          {Object.entries(def.bonuses).map(([stat, value]) => (
            <div key={stat} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{STAT_LABELS[stat] || stat}</span>
              <span className="text-green-400 font-bold">+{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: RARITY_COLORS[def.rarity] + '30', color: RARITY_COLORS[def.rarity] }}
          >
            {RARITY_NAMES[def.rarity]}
          </span>
          {isEquipped ? (
            <span className="text-xs text-yellow-400">👤 {equipper?.name}</span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEquip(item);
              }}
              className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded transition-all"
            >
              装备
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPotionCard = (item: Potion) => {
    const def = POTION_DEFS[item.defId];
    if (!def) return null;
    const isUsed = item.isUsed;
    const user = isUsed ? state.students.find((s) => s.id === item.usedBy) : null;

    const remaining = item.endTime ? Math.max(0, item.endTime - Date.now()) : 0;
    const minutes = Math.floor(remaining / 60000);

    return (
      <div
        key={item.id}
        onClick={() => setSelectedItem(item)}
        className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
          selectedItem?.id === item.id
            ? 'border-yellow-400 bg-yellow-900/20 scale-[1.02]'
            : 'border-slate-600 bg-slate-800/50 hover:border-purple-400'
        } ${isUsed ? 'opacity-70' : ''}`}
      >
        <div className="flex items-start gap-2 mb-2">
          <span className="text-3xl">{def.icon}</span>
          <div className="flex-1 min-w-0">
            <span
              className="font-bold text-sm truncate block"
              style={{ color: RARITY_COLORS[def.rarity] }}
            >
              {def.name}
            </span>
            <div className="text-xs text-gray-500 mt-0.5">{def.description}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-400">
            {def.effectType === 'buff' ? '攻击加成' : '生命加成'}
          </span>
          <span className="text-green-400 font-bold">+{def.effectValue}%</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: RARITY_COLORS[def.rarity] + '30', color: RARITY_COLORS[def.rarity] }}
          >
            {RARITY_NAMES[def.rarity]}
          </span>
          {isUsed ? (
            <span className="text-xs text-yellow-400">
              👤 {user?.name} ({minutes}分钟)
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUsePotion(item);
              }}
              className="px-3 py-1 text-xs font-bold bg-green-600 hover:bg-green-500 text-white rounded transition-all"
            >
              使用
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderStudentCard = (student: Student) => {
    const isSelected = student.id === selectedStudentId;
    return (
      <div
        key={student.id}
        onClick={() => setSelectedStudentId(student.id)}
        className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
          isSelected
            ? 'border-yellow-400 bg-yellow-900/20'
            : 'border-slate-600 bg-slate-800/50 hover:border-purple-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-4xl">{student.avatar}</div>
          <div className="flex-1 min-w-0">
            <div
              className="font-bold truncate"
              style={{ color: RARITY_COLORS[student.rarity] }}
            >
              {student.name}
            </div>
            <div className="text-xs text-gray-400">Lv.{student.level} {RARITY_NAMES[student.rarity]}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">已装备</div>
            <div className="text-sm font-bold text-white">
              {Object.values(student.equipment).filter(Boolean).length}/4
            </div>
          </div>
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
          <span>⚔️</span> 装备与药剂
        </h2>
      </div>

      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
        {[
          { key: 'equipment', label: '⚔️ 装备' },
          { key: 'potions', label: '🧪 药剂' },
          { key: 'inventory', label: '📦 库存' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-white">👤 选择学员</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {state.students.map((student) => renderStudentCard(student))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'equipment' && selectedStudent && (
            <>
              {renderStatsComparison()}
              {renderEquipmentSlots()}
            </>
          )}

          {activeTab === 'potions' && selectedStudent && (
            <>
              {renderStatsComparison()}
              {renderActivePotions()}
            </>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📦</span> 装备库存
                  <span className="text-sm text-gray-400 font-normal">({state.equipment.length})</span>
                </h3>
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: '全部' },
                    { key: 'weapon', label: '武器' },
                    { key: 'armor', label: '护甲' },
                    { key: 'accessory', label: '饰品' },
                    { key: 'relic', label: '遗物' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setEquipmentFilter(filter.key as FilterType)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        equipmentFilter === filter.key
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEquipment.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-600">
                  <div className="text-6xl mb-4">⚔️</div>
                  <p className="text-gray-400">暂无装备</p>
                  <p className="text-gray-600 text-sm mt-1">前往副本或炼金室获取装备吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredEquipment.map((item) => renderEquipmentCard(item))}
                </div>
              )}

              <div className="pt-4 border-t border-slate-700">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                  <span>🧪</span> 药剂库存
                  <span className="text-sm text-gray-400 font-normal">
                    ({state.potions.filter((p) => !p.isUsed).length})
                  </span>
                </h3>
                {state.potions.filter((p) => !p.isUsed).length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-600">
                    <div className="text-4xl mb-2">🧪</div>
                    <p className="text-gray-400">暂用药剂</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {state.potions.filter((p) => !p.isUsed).map((item) => renderPotionCard(item))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedStudent && (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-600">
              <div className="text-6xl mb-4">👤</div>
              <p className="text-gray-400">请从左侧选择一名学员</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

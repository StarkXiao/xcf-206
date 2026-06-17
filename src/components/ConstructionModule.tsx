import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BUILDING_DEFS } from '../data/gameData';
import { Building, BuildingType } from '../types/game';
import { formatNumber } from '../utils/gameUtils';
import { AcademyMap } from './AcademyMap';

interface Props {
  onClose?: () => void;
}

export function ConstructionModule({ onClose }: Props) {
  const { state, dispatch, getBuildingCost, canAfford } = useGame();
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [buildMode, setBuildMode] = useState(false);

  const handleBuildingClick = (building: Building) => {
    setSelectedBuilding(building);
  };

  const handleUpgrade = () => {
    if (!selectedBuilding) return;
    const def = BUILDING_DEFS[selectedBuilding.type];
    if (selectedBuilding.level >= def.maxLevel) return;
    const cost = getBuildingCost(selectedBuilding.type, selectedBuilding.level);
    if (!canAfford(cost)) return;
    dispatch({ type: 'UPGRADE_BUILDING', buildingType: selectedBuilding.type });
    const updated = state.buildings.find((b) => b.type === selectedBuilding.type);
    if (updated) {
      setSelectedBuilding({ ...updated, level: updated.level + 1, constructed: true });
    }
  };

  const renderBuildingCard = (building: Building) => {
    const def = BUILDING_DEFS[building.type];
    const cost = getBuildingCost(building.type, building.level);
    const affordable = canAfford(cost);
    const isMaxLevel = building.level >= def.maxLevel;
    const mainHall = state.buildings.find((b) => b.type === 'main_hall');
    const canUpgradeLevel =
      building.type === 'main_hall' || building.level < (mainHall?.level || 1);

    const isSelected = selectedBuilding?.type === building.type;

    return (
      <div
        key={building.type}
        onClick={() => setSelectedBuilding(building)}
        className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-[1.02] ${
          isSelected
            ? 'border-yellow-400 bg-yellow-900/30'
            : building.constructed
            ? 'border-purple-600/50 bg-purple-900/20 hover:border-purple-400'
            : 'border-gray-600/50 bg-gray-800/30 hover:border-gray-400'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="text-4xl flex-shrink-0">{def.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-white truncate">{def.name}</h3>
              {building.level > 0 && (
                <span className="bg-yellow-600 px-2 py-0.5 rounded text-xs font-bold text-white whitespace-nowrap">
                  Lv.{building.level}
                </span>
              )}
              {!building.constructed && (
                <span className="bg-gray-600 px-2 py-0.5 rounded text-xs text-gray-300 whitespace-nowrap">
                  未建造
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-2 line-clamp-2">{def.description}</p>

            {!isMaxLevel && (
              <div className="space-y-1">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {cost.gold > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        state.resources.gold >= cost.gold
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      💰{formatNumber(cost.gold)}
                    </span>
                  )}
                  {cost.mana > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        state.resources.mana >= cost.mana
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      💎{formatNumber(cost.mana)}
                    </span>
                  )}
                  {cost.crystals > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        state.resources.crystals >= cost.crystals
                          ? 'bg-purple-900/50 text-purple-300'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      💠{formatNumber(cost.crystals)}
                    </span>
                  )}
                  {cost.materials > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        state.resources.materials >= cost.materials
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      📦{formatNumber(cost.materials)}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBuilding(building);
                    handleUpgrade();
                  }}
                  disabled={!affordable || !canUpgradeLevel}
                  className={`w-full py-1.5 rounded text-sm font-bold transition-all ${
                    affordable && canUpgradeLevel
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-md hover:shadow-green-500/30'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isMaxLevel
                    ? '已满级'
                    : !canUpgradeLevel
                    ? '需升级主楼'
                    : building.constructed
                    ? `升级到 Lv.${building.level + 1}`
                    : '建造'}
                </button>
              </div>
            )}

            {isMaxLevel && (
              <div className="text-center py-1.5 bg-gradient-to-r from-yellow-600/30 to-orange-600/30 rounded text-yellow-400 text-sm font-bold">
                ⭐ 已达最高等级
              </div>
            )}
          </div>
        </div>

        {def.special && building.level > 0 && (
          <div className="mt-2 pt-2 border-t border-purple-700/30 text-xs text-cyan-400">
            ✨ {def.special}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🏗️</span> 学院建设
        </h2>
        <button
          onClick={() => setBuildMode(!buildMode)}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            buildMode
              ? 'bg-yellow-600 text-white'
              : 'bg-purple-700 hover:bg-purple-600 text-white'
          }`}
        >
          {buildMode ? '📐 建造模式开' : '🏛️ 查看模式'}
        </button>
      </div>

      <div className="relative">
        <AcademyMap
          buildings={state.buildings}
          onBuildingClick={handleBuildingClick}
          selectedBuilding={selectedBuilding?.type || null}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {state.buildings.map(renderBuildingCard)}
      </div>

      {selectedBuilding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-900 to-purple-950 rounded-xl border-2 border-purple-500 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-5xl">{BUILDING_DEFS[selectedBuilding.type].icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-yellow-400">
                    {BUILDING_DEFS[selectedBuilding.type].name}
                  </h3>
                  <p className="text-purple-300 text-sm">
                    {selectedBuilding.constructed
                      ? `等级 ${selectedBuilding.level} / ${BUILDING_DEFS[selectedBuilding.type].maxLevel}`
                      : '尚未建造'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-300 mb-4">{BUILDING_DEFS[selectedBuilding.type].description}</p>

            {BUILDING_DEFS[selectedBuilding.type].special && (
              <div className="bg-cyan-900/30 border border-cyan-600/50 rounded-lg p-3 mb-4">
                <p className="text-cyan-400 text-sm">
                  ✨ {BUILDING_DEFS[selectedBuilding.type].special}
                </p>
              </div>
            )}

            {selectedBuilding.level < BUILDING_DEFS[selectedBuilding.type].maxLevel && (
              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <h4 className="text-sm font-bold text-purple-300 mb-2">升级消耗</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      getBuildingCost(selectedBuilding.type, selectedBuilding.level)
                    ).map(
                      ([key, value]) =>
                        (value as number) > 0 && (
                          <span
                            key={key}
                            className={`px-2 py-1 rounded text-sm ${
                              state.resources[key as keyof typeof state.resources] >=
                              (value as number)
                                ? 'bg-green-900/50 text-green-300'
                                : 'bg-red-900/50 text-red-400'
                            }`}
                          >
                            {key === 'gold' && '💰'}
                            {key === 'mana' && '💎'}
                            {key === 'crystals' && '💠'}
                            {key === 'materials' && '📦'}
                            {formatNumber(value as number)}
                          </span>
                        )
                    )}
                  </div>
                </div>

                <button
                  onClick={handleUpgrade}
                  disabled={!canAfford(getBuildingCost(selectedBuilding.type, selectedBuilding.level))}
                  className="w-full py-3 rounded-lg font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {selectedBuilding.constructed
                    ? `⬆️ 升级到 Lv.${selectedBuilding.level + 1}`
                    : '🔨 建造建筑'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

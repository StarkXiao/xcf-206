import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { RECIPES, MATERIAL_DEFS, RARITY_COLORS, RARITY_NAMES, EQUIPMENT_DEFS, POTION_DEFS } from '../data/gameData';
import { Recipe, MaterialType } from '../types/game';
import { formatNumber, formatCraftTime, getRemainingCraftTime } from '../utils/gameUtils';

type TabType = 'craft' | 'materials' | 'jobs';

export function AlchemyModule() {
  const { state, canAfford, canAffordMaterials, startCrafting, claimCrafting, getAlchemyLevel } = useGame();
  const [activeTab, setActiveTab] = useState<TabType>('craft');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const alchemyLevel = getAlchemyLevel();
  const availableRecipes = RECIPES.filter((r) => r.requiredAlchemyLevel <= alchemyLevel);
  const lockedRecipes = RECIPES.filter((r) => r.requiredAlchemyLevel > alchemyLevel);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartCrafting = (recipe: Recipe) => {
    if (!canAfford({ gold: recipe.goldCost, mana: recipe.manaCost })) {
      showNotification('⚠️ 金币或魔力不足');
      return;
    }
    const materialsNeeded = Object.fromEntries(recipe.materials.map((m) => [m.type, m.quantity]));
    if (!canAffordMaterials(materialsNeeded)) {
      showNotification('⚠️ 材料不足');
      return;
    }
    startCrafting(recipe);
    showNotification(`✨ 开始制作: ${recipe.name}`);
  };

  const handleClaim = (jobId: string) => {
    claimCrafting(jobId);
    showNotification('🎉 制作完成，已领取！');
  };

  const activeJobs = state.craftingJobs.filter((j) => !j.claimed);
  const completedJobs = activeJobs.filter((j) => j.completed);
  const inProgressJobs = activeJobs.filter((j) => !j.completed);

  const getOutputItem = (recipe: Recipe) => {
    if (recipe.type === 'equipment') {
      return EQUIPMENT_DEFS[recipe.outputId];
    }
    return POTION_DEFS[recipe.outputId];
  };

  const renderRecipeCard = (recipe: Recipe, locked: boolean = false) => {
    const def = getOutputItem(recipe);
    if (!def) return null;

    const materialsNeeded = Object.fromEntries(recipe.materials.map((m) => [m.type, m.quantity]));
    const canCraft = !locked && canAfford({ gold: recipe.goldCost, mana: recipe.manaCost }) && canAffordMaterials(materialsNeeded);

    return (
      <div
        key={recipe.id}
        onClick={() => !locked && setSelectedRecipe(recipe)}
        className={`p-4 rounded-xl border-2 transition-all ${
          locked
            ? 'border-gray-700 bg-gray-800/30 opacity-60 cursor-not-allowed'
            : selectedRecipe?.id === recipe.id
            ? 'border-yellow-400 bg-yellow-900/20 scale-[1.02] cursor-pointer'
            : 'border-slate-600 bg-slate-800/50 hover:border-purple-400 cursor-pointer'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="text-4xl">{recipe.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-bold text-white truncate">{recipe.name}</h4>
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ background: RARITY_COLORS[def.rarity] + '30', color: RARITY_COLORS[def.rarity] }}
              >
                {RARITY_NAMES[def.rarity]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{def.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recipe.materials.map((mat) => {
                const matDef = MATERIAL_DEFS[mat.type];
                const hasEnough = (state.materials[mat.type] || 0) >= mat.quantity;
                return (
                  <span
                    key={mat.type}
                    className={`px-2 py-0.5 rounded text-xs ${
                      hasEnough ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    {matDef?.icon} {matDef?.name} x{mat.quantity}
                    <span className="text-gray-500 ml-1">({state.materials[mat.type] || 0})</span>
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  state.resources.gold >= recipe.goldCost ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-400'
                }`}
              >
                💰 {formatNumber(recipe.goldCost)}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  state.resources.mana >= recipe.manaCost ? 'bg-blue-900/50 text-blue-300' : 'bg-red-900/50 text-red-400'
                }`}
              >
                💎 {formatNumber(recipe.manaCost)}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-purple-900/50 text-purple-300">
                ⏱️ {formatCraftTime(recipe.craftTime)}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-orange-900/50 text-orange-300">
                📦 x{recipe.outputQuantity}
              </span>
            </div>
            {locked && (
              <div className="text-xs text-red-400">🔒 需要炼金室 Lv.{recipe.requiredAlchemyLevel}</div>
            )}
            {!locked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartCrafting(recipe);
                }}
                disabled={!canCraft}
                className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                  canCraft
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-md'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                🔨 开始制作
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCraftTab = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-xl border border-purple-600/50 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold text-white">⚗️ 炼金实验室</h3>
            <p className="text-sm text-gray-400">炼金室等级: Lv.{alchemyLevel}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-700/50 px-3 py-1.5 rounded-lg">
              <span className="text-gray-400 text-sm">制作中: </span>
              <span className="text-orange-400 font-bold">{inProgressJobs.length}</span>
            </div>
            <div className="bg-slate-700/50 px-3 py-1.5 rounded-lg">
              <span className="text-gray-400 text-sm">待领取: </span>
              <span className="text-green-400 font-bold">{completedJobs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {alchemyLevel === 0 && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-xl p-4 text-center">
          <div className="text-4xl mb-2">🔒</div>
          <p className="text-yellow-300 font-bold">请先建造炼金实验室！</p>
          <p className="text-yellow-400/60 text-sm mt-1">前往「建设」页面建造炼金实验室解锁此功能</p>
        </div>
      )}

      {alchemyLevel > 0 && (
        <>
          <div>
            <h4 className="text-md font-bold text-white mb-3 flex items-center gap-2">
              <span>📜</span> 可用配方 ({availableRecipes.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {availableRecipes.map((recipe) => renderRecipeCard(recipe))}
            </div>
          </div>

          {lockedRecipes.length > 0 && (
            <div>
              <h4 className="text-md font-bold text-gray-500 mb-3 flex items-center gap-2">
                <span>🔒</span> 未解锁配方 ({lockedRecipes.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {lockedRecipes.map((recipe) => renderRecipeCard(recipe, true))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderMaterialsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <span>📦</span> 材料库存
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {(Object.entries(state.materials) as [MaterialType, number][]).map(([type, quantity]) => {
          const def = MATERIAL_DEFS[type];
          if (!def) return null;
          return (
            <div
              key={type}
              className="bg-slate-800/50 rounded-xl border border-slate-600/50 p-4 text-center hover:border-purple-400 transition-all"
            >
              <div className="text-4xl mb-2">{def.icon}</div>
              <div className="font-bold text-white text-sm truncate">{def.name}</div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">{quantity}</div>
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">{def.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderJobsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <span>🔨</span> 制作任务
      </h3>

      {activeJobs.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-600">
          <div className="text-6xl mb-4">⚗️</div>
          <p className="text-gray-400">暂无制作任务</p>
          <p className="text-gray-600 text-sm mt-1">前往「制作」页面开始炼金吧！</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeJobs.map((job) => {
            const recipe = RECIPES.find((r) => r.id === job.recipeId);
            if (!recipe) return null;
            const def = getOutputItem(recipe);
            const progress = Math.min(100, ((Date.now() - job.startTime) / (job.endTime - job.startTime)) * 100);

            return (
              <div
                key={job.id}
                className={`bg-slate-800/50 rounded-xl border-2 p-4 ${
                  job.completed ? 'border-green-500/50 bg-green-900/20' : 'border-orange-500/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{recipe.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-white">{recipe.name}</h4>
                        <p className="text-xs text-gray-400">x{recipe.outputQuantity}</p>
                      </div>
                      {job.completed ? (
                        <button
                          onClick={() => handleClaim(job.id)}
                          className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg animate-pulse"
                        >
                          🎁 领取
                        </button>
                      ) : (
                        <div className="text-sm text-orange-400 font-bold">
                          ⏱️ {getRemainingCraftTime(job.endTime)}
                        </div>
                      )}
                    </div>
                    {!job.completed && (
                      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                    {job.completed && def && (
                      <div className="mt-2 p-2 bg-slate-700/50 rounded-lg">
                        <p className="text-xs text-green-300">
                          ✨ 获得 {def.name} x{recipe.outputQuantity}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-pulse">
          {notification}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>⚗️</span> 炼金实验室
        </h2>
      </div>

      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
        {[
          { key: 'craft', label: '🔨 制作' },
          { key: 'materials', label: '📦 材料' },
          { key: 'jobs', label: '📋 任务' },
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

      {activeTab === 'craft' && renderCraftTab()}
      {activeTab === 'materials' && renderMaterialsTab()}
      {activeTab === 'jobs' && renderJobsTab()}
    </div>
  );
}

import { useGame } from '../context/GameContext';
import { formatNumber } from '../utils/gameUtils';

const RESOURCE_CONFIG = [
  { key: 'gold', name: '金币', icon: '💰', color: 'from-yellow-600 to-yellow-500' },
  { key: 'mana', name: '魔力', icon: '💎', color: 'from-blue-600 to-cyan-500' },
  { key: 'crystals', name: '魔晶', icon: '💠', color: 'from-purple-600 to-pink-500' },
  { key: 'materials', name: '材料', icon: '📦', color: 'from-green-600 to-emerald-500' },
  { key: 'exp', name: '学院经验', icon: '⭐', color: 'from-orange-600 to-red-500' },
];

export function ResourceBar() {
  const { state } = useGame();
  const { resources, day, academyName, academyLevel, academyExp } = state;
  const expNeeded = academyLevel * 500;
  const expPercent = (academyExp / expNeeded) * 100;

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border-b-2 border-purple-600 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏰</span>
            <div>
              <h1 className="text-xl font-bold text-yellow-400 tracking-wide">{academyName}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-300">第 {day} 天</span>
                <span className="text-xs bg-purple-700/50 px-2 py-0.5 rounded text-purple-200">
                  学院 Lv.{academyLevel}
                </span>
              </div>
            </div>
          </div>
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden hidden md:block">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
              style={{ width: `${Math.min(100, expPercent)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {RESOURCE_CONFIG.map((config) => (
            <div
              key={config.key}
              className={`flex items-center gap-1.5 bg-gradient-to-r ${config.color} px-3 py-1.5 rounded-lg shadow-md hover:scale-105 transition-transform`}
              title={config.name}
            >
              <span className="text-lg">{config.icon}</span>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-white/80 font-medium">{config.name}</span>
                <span className="text-sm font-bold text-white">
                  {formatNumber(resources[config.key as keyof typeof resources])}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { ModuleType } from '../types/game';

interface Props {
  currentModule: ModuleType;
  onNavigate: (module: ModuleType) => void;
}

const NAV_ITEMS: Array<{
  module: ModuleType;
  icon: string;
  label: string;
  color: string;
}> = [
  { module: 'overview', icon: '🏠', label: '总览', color: 'from-blue-500 to-cyan-500' },
  { module: 'construction', icon: '🏗️', label: '建设', color: 'from-yellow-500 to-orange-500' },
  { module: 'recruitment', icon: '🎓', label: '招募', color: 'from-purple-500 to-pink-500' },
  { module: 'courses', icon: '📖', label: '课程', color: 'from-indigo-500 to-blue-500' },
  { module: 'dungeon', icon: '⚔️', label: '试炼', color: 'from-red-500 to-orange-500' },
  { module: 'schedule', icon: '📅', label: '排班', color: 'from-cyan-500 to-teal-500' },
  { module: 'settlement', icon: '💹', label: '结算', color: 'from-green-500 to-emerald-500' },
  { module: 'settings', icon: '⚙️', label: '设置', color: 'from-slate-500 to-gray-500' },
];

export function Navigation({ currentModule, onNavigate }: Props) {
  return (
    <nav className="w-full bg-gradient-to-r from-slate-900/95 via-purple-950/95 to-slate-900/95 backdrop-blur-sm border-b-2 border-purple-700/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center lg:justify-start gap-1 lg:gap-2 py-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = currentModule === item.module;
            return (
              <button
                key={item.module}
                onClick={() => onNavigate(item.module)}
                className={`relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-105`
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className={`${isActive ? 'text-lg' : 'text-lg'}`}>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/50 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

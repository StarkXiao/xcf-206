import { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { ResourceBar } from './components/ResourceBar';
import { Navigation } from './components/Navigation';
import { OverviewModule } from './components/OverviewModule';
import { ConstructionModule } from './components/ConstructionModule';
import { RecruitmentModule } from './components/RecruitmentModule';
import { CourseModule } from './components/CourseModule';
import { DungeonModule } from './components/DungeonModule';
import { SettlementModule } from './components/SettlementModule';
import { SettingsModule } from './components/SettingsModule';
import { ModuleType } from './types/game';
import './App.css';

function GameContent() {
  const [currentModule, setCurrentModule] = useState<ModuleType>('overview');
  const { state, saveGame } = useGame();
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('magic_academy_save');
  });

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveGame();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state, saveGame]);

  const renderModule = () => {
    switch (currentModule) {
      case 'overview':
        return <OverviewModule onNavigate={setCurrentModule} />;
      case 'construction':
        return <ConstructionModule />;
      case 'recruitment':
        return <RecruitmentModule />;
      case 'courses':
        return <CourseModule />;
      case 'dungeon':
        return <DungeonModule />;
      case 'settlement':
        return <SettlementModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <OverviewModule onNavigate={setCurrentModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <ResourceBar />
      <Navigation currentModule={currentModule} onNavigate={setCurrentModule} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderModule()}
      </main>

      <footer className="mt-12 py-6 border-t border-purple-800/50 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            🏰 魔法学院 · Magic Academy Simulator
          </p>
          <p className="text-gray-600 text-xs mt-1">
            建设 → 招募 → 培养 → 试炼 · 打造属于你的传奇魔法学院！
          </p>
        </div>
      </footer>

      {showWelcome && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div 
            className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 rounded-2xl border-2 border-purple-500 max-w-2xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-3 right-4 text-gray-400 hover:text-white text-2xl z-50 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all"
            >
              ✕
            </button>
            <div className="absolute top-0 right-0 text-[200px] md:text-[250px] opacity-5 leading-none select-none pointer-events-none">
              🏰
            </div>
            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="text-6xl md:text-7xl mb-4">✨🏰✨</div>
                <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 mb-2">
                  欢迎来到魔法学院！
                </h1>
                <p className="text-purple-300 text-base md:text-lg">
                  在这里，你将建立并经营一所属于自己的魔法学院
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
                {[
                  { icon: '🏗️', title: '建设学院', desc: '建造各类魔法建筑' },
                  { icon: '🎓', title: '招募学员', desc: '收集各种天赋的法师' },
                  { icon: '📖', title: '开设课程', desc: '提升学员各项能力' },
                  { icon: '⚔️', title: '挑战试炼', desc: '战胜魔兽获取奖励' },
                  { icon: '💹', title: '经营管理', desc: '合理分配资源产出' },
                  { icon: '🏆', title: '成就传奇', desc: '打造顶级魔法学院' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-800/50 rounded-lg p-2 md:p-3 border border-slate-700/50"
                  >
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-sm font-bold text-white">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-3 md:p-4 mb-4 md:mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="text-sm text-yellow-200">
                    <p className="font-bold mb-1">新手指引</p>
                    <p>1. 先去「招募」获取你的第一批学员</p>
                    <p>2. 在「课程」中安排他们学习提升</p>
                    <p>3. 实力足够后去「试炼」挑战获取资源</p>
                    <p>4. 最后「结算」进入下一天，发展壮大！</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowWelcome(false)}
                className="w-full py-3 md:py-4 rounded-xl font-bold text-lg md:text-xl bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-500 hover:from-yellow-400 hover:via-pink-400 hover:to-purple-400 text-white shadow-2xl hover:shadow-purple-500/50 transition-all active:scale-[0.98]"
              >
                🚀 开始我的魔法学院之旅！
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;

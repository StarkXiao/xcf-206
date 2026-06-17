import { useState } from 'react';
import { useGame } from '../context/GameContext';

interface Props {}

export function SettingsModule({}: Props) {
  const { state, dispatch, saveGame, loadGame } = useGame();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [exportData, setExportData] = useState<string>('');
  const [importInput, setImportInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = () => {
    saveGame();
    showMessage('success', '✅ 游戏已保存！');
  };

  const handleLoad = () => {
    const success = loadGame();
    if (success) {
      showMessage('success', '✅ 存档已读取！');
    } else {
      showMessage('error', '❌ 没有找到存档');
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_GAME' });
    localStorage.removeItem('magic_academy_save');
    setShowResetConfirm(false);
    showMessage('success', '🔄 游戏已重置！');
  };

  const handleExport = () => {
    try {
      const data = JSON.stringify(state, null, 2);
      setExportData(data);
      navigator.clipboard.writeText(data);
      showMessage('success', '📋 存档数据已复制到剪贴板！');
    } catch (e) {
      showMessage('error', '❌ 导出失败');
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importInput);
      if (parsed.resources && parsed.buildings && parsed.students) {
        dispatch({ type: 'LOAD_STATE', state: parsed });
        localStorage.setItem('magic_academy_save', importInput);
        setShowImport(false);
        setImportInput('');
        showMessage('success', '✅ 存档导入成功！');
      } else {
        throw new Error('Invalid data');
      }
    } catch (e) {
      showMessage('error', '❌ 存档数据格式错误');
    }
  };

  const downloadSave = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magic_academy_save_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('success', '💾 存档文件已下载！');
  };

  const toggleSetting = (key: keyof typeof state.settings) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { [key]: !state.settings[key] },
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 ${
            message.type === 'success'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
              : message.type === 'error'
              ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>⚙️</span> 设置与存档
        </h2>
        <div className="text-sm text-gray-400">
          上次保存: {formatDate(state.lastSaveTime)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-800/80 to-blue-900/30 rounded-xl border-2 border-blue-500/50 p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
            <span>🎮</span> 游戏设置
          </h3>
          <div className="space-y-4">
            <SettingToggle
              label="音效"
              description="启用游戏音效"
              icon="🔊"
              enabled={state.settings.soundEnabled}
              onToggle={() => toggleSetting('soundEnabled')}
            />
            <SettingToggle
              label="背景音乐"
              description="启用游戏背景音乐"
              icon="🎵"
              enabled={state.settings.musicEnabled}
              onToggle={() => toggleSetting('musicEnabled')}
            />
            <SettingToggle
              label="消息通知"
              description="显示游戏内通知消息"
              icon="🔔"
              enabled={state.settings.notificationsEnabled}
              onToggle={() => toggleSetting('notificationsEnabled')}
            />
            <SettingToggle
              label="自动保存"
              description="每30秒自动保存游戏"
              icon="💾"
              enabled={state.settings.autoSave}
              onToggle={() => toggleSetting('autoSave')}
            />

            <div className="pt-4 border-t border-slate-600/50">
              <label className="text-sm text-gray-400 mb-2 block">动画速度</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.25"
                  value={state.settings.animationSpeed}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_SETTINGS',
                      settings: { animationSpeed: parseFloat(e.target.value) },
                    })
                  }
                  className="flex-1"
                />
                <span className="text-white font-bold w-12 text-right">
                  {state.settings.animationSpeed}x
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-600/50">
              <label className="text-sm text-gray-400 mb-2 block">学院名称</label>
              <input
                type="text"
                value={state.academyName}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_SETTINGS',
                    settings: {} as any,
                  })
                }
                className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-blue-400 outline-none"
                placeholder="输入学院名称"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-green-900/30 rounded-xl border-2 border-green-500/50 p-6">
          <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <span>💾</span> 存档管理
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleSave}
              className="w-full py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">💾</span> 手动保存游戏
            </button>

            <button
              onClick={handleLoad}
              className="w-full py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">📂</span> 读取存档
            </button>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-600/50">
              <button
                onClick={handleExport}
                className="py-2.5 px-3 rounded-lg font-bold bg-purple-700 hover:bg-purple-600 text-white transition-all flex items-center justify-center gap-1"
              >
                📤 导出
              </button>
              <button
                onClick={() => setShowImport(!showImport)}
                className="py-2.5 px-3 rounded-lg font-bold bg-indigo-700 hover:bg-indigo-600 text-white transition-all flex items-center justify-center gap-1"
              >
                📥 导入
              </button>
            </div>

            <button
              onClick={downloadSave}
              className="w-full py-2.5 px-4 rounded-lg font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all flex items-center justify-center gap-2"
            >
              <span>⬇️</span> 下载存档文件
            </button>

            {showImport && (
              <div className="pt-3 border-t border-slate-600/50 space-y-2">
                <textarea
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder="粘贴存档数据..."
                  className="w-full h-24 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-indigo-400 outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleImport}
                    disabled={!importInput.trim()}
                    className="flex-1 py-2 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
                  >
                    确认导入
                  </button>
                  <button
                    onClick={() => {
                      setShowImport(false);
                      setImportInput('');
                    }}
                    className="px-4 py-2 rounded-lg font-bold bg-slate-600 hover:bg-slate-500 text-white transition-all"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {exportData && (
              <div className="pt-3 border-t border-slate-600/50 space-y-2">
                <div className="text-xs text-gray-400">导出的存档数据（已复制）：</div>
                <textarea
                  value={exportData}
                  readOnly
                  className="w-full h-32 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-gray-400 text-xs font-mono resize-none"
                />
                <button
                  onClick={() => setExportData('')}
                  className="w-full py-2 rounded-lg font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-xl border-2 border-red-500/50 p-6">
        <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
          <span>⚠️</span> 危险操作
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-gray-400 text-sm flex-1">
            重置游戏将清除所有进度，包括建筑、学员、资源等。此操作无法撤销！
          </p>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-6 py-2.5 rounded-lg font-bold bg-red-700 hover:bg-red-600 text-white transition-all"
            >
              🔄 重置游戏
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white transition-all animate-pulse"
              >
                确认重置
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2.5 rounded-lg font-bold bg-slate-600 hover:bg-slate-500 text-white transition-all"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/30 rounded-xl border-2 border-purple-500/50 p-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
          <span>📊</span> 游戏统计
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="游戏天数" value={`第 ${state.day} 天`} icon="📅" />
          <StatCard label="学院等级" value={`Lv.${state.academyLevel}`} icon="🏆" />
          <StatCard label="学员总数" value={`${state.students.length} 人`} icon="👥" />
          <StatCard label="已建建筑" value={`${state.buildings.filter(b => b.constructed).length} 座`} icon="🏛️" />
          <StatCard label="试炼次数" value={`${state.dungeonRuns} 次`} icon="⚔️" />
          <StatCard label="战斗胜利" value={`${state.totalVictories} 次`} icon="🏆" />
          <StatCard
            label="胜率"
            value={`${state.dungeonRuns > 0 ? Math.round((state.totalVictories / state.dungeonRuns) * 100) : 0}%`}
            icon="📈"
          />
          <StatCard label="持有金币" value={state.resources.gold.toLocaleString()} icon="💰" />
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-6">
        <h3 className="text-lg font-bold text-gray-300 mb-3 flex items-center gap-2">
          <span>📖</span> 关于游戏
        </h3>
        <div className="text-sm text-gray-400 space-y-2">
          <p>
            <span className="text-yellow-400 font-bold">魔法学院</span> - 一款西方魔幻题材的经营模拟游戏。
          </p>
          <p>通过建设学院、招募学员、开设课程、挑战试炼来打造最强的魔法学院！</p>
          <div className="pt-2 border-t border-slate-700 mt-3">
            <p>🎮 游戏玩法循环：</p>
            <p className="pl-4">建设 → 招募 → 培养 → 试炼 → 获取资源 → 继续建设</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  icon,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-bold text-white">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-14 h-7 rounded-full transition-all ${
          enabled ? 'bg-green-500' : 'bg-slate-600'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
            enabled ? 'left-8' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

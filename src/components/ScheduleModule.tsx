import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { RARITY_COLORS, ELEMENT_ICONS, ACTIVITY_NAMES, ACTIVITY_ICONS, ACTIVITY_COLORS, COURSE_DEFS, DUNGEON_DEFS, DIFFICULTY_NAMES, TIME_CONFIG } from '../data/gameData';
import { getFatigueLevel, getFatigueLevelName, getFatigueLevelColor, calculateRestFatigueRecovery, hasSchedulingConflict, calculateStudyFatigueCost, calculateDungeonFatigueCost, formatGameTime, getTimeOfDay, getTimeOfDayName, getTimeOfDayIcon } from '../utils/gameUtils';
import { ActivityType, Student, ScheduleStatus } from '../types/game';

interface Props {}

export function ScheduleModule({}: Props) {
  const { state, dispatch, addScheduleEntry, removeScheduleEntry, clearSchedule, restStudent, getEfficiencyMultiplier, advanceMinutes, toggleAutoExecute, triggerNewDay } = useGame();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedDungeon, setSelectedDungeon] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [notification, setNotification] = useState<string | null>(null);
  const [showBulkRest, setShowBulkRest] = useState(false);

  const dorm = state.buildings.find((b) => b.type === 'dormitory');
  const dormLevel = dorm?.level || 1;
  const currentTime = state.time;
  const timeOfDay = getTimeOfDay(currentTime);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddSchedule = () => {
    if (!selectedStudent || !selectedActivity) {
      showNotification('⚠️ 请选择学员和活动');
      return;
    }

    if (hasSchedulingConflict(state.schedule.entries, selectedStudent, startTime, duration)) {
      showNotification('⚠️ 该时间段已有安排');
      return;
    }

    const student = state.students.find((s) => s.id === selectedStudent);
    if (!student) return;

    const activity = selectedActivity;
    let courseType = undefined;
    let dungeonId = undefined;

    if (activity === 'study' && selectedCourse) {
      courseType = selectedCourse as any;
    }
    if (activity === 'dungeon' && selectedDungeon) {
      dungeonId = selectedDungeon;
    }

    addScheduleEntry({
      studentId: selectedStudent,
      activity,
      startTime,
      duration,
      courseType,
      dungeonId,
    });

    showNotification(`✅ 已为 ${student.name.split('·')[0]} 安排${ACTIVITY_NAMES[activity]}`);
    setSelectedStudent(null);
    setSelectedActivity(null);
    setSelectedCourse(null);
    setSelectedDungeon(null);
  };

  const handleRestStudent = (studentId: string, restDuration: number = 60) => {
    const student = state.students.find((s) => s.id === studentId);
    if (!student) return;

    restStudent(studentId, restDuration);
    const recovery = calculateRestFatigueRecovery(restDuration, dormLevel);
    showNotification(`😴 ${student.name.split('·')[0]} 开始休息，预计恢复 ${recovery} 点疲劳`);
  };

  const handleBulkRest = (restDuration: number = 60) => {
    const tiredStudents = state.students.filter((s) => s.fatigue > s.maxFatigue * 0.5 && s.status === 'idle');
    tiredStudents.forEach((s) => restStudent(s.id, restDuration));
    showNotification(`😴 已让 ${tiredStudents.length} 名疲劳的学员开始休息`);
    setShowBulkRest(false);
  };

  const getScheduleForStudent = (studentId: string) => {
    return state.schedule.entries
      .filter((e) => e.studentId === studentId)
      .sort((a, b) => a.startTime - b.startTime);
  };

  const getScheduleStatusLabel = (status?: ScheduleStatus): { text: string; color: string } => {
    switch (status) {
      case 'active': return { text: '执行中', color: 'text-green-400' };
      case 'completed': return { text: '已完成', color: 'text-blue-400' };
      case 'skipped': return { text: '已跳过', color: 'text-gray-400' };
      default: return { text: '待执行', color: 'text-yellow-400' };
    }
  };

  const getStatusBadgeClass = (status?: ScheduleStatus): string => {
    switch (status) {
      case 'active': return 'bg-green-500/20 border-green-500';
      case 'completed': return 'bg-blue-500/20 border-blue-500';
      case 'skipped': return 'bg-gray-500/20 border-gray-500';
      default: return 'bg-yellow-500/20 border-yellow-500';
    }
  };

  const getFatigueBarColor = (student: Student) => {
    const level = getFatigueLevel(student.fatigue, student.maxFatigue);
    return getFatigueLevelColor(level);
  };

  const renderTimeline = () => {
    const totalMinutes = TIME_CONFIG.MINUTES_PER_DAY;
    const hours = 24;
    const hourWidth = 100 / hours;

    const getPosition = (time: number) => (time / totalMinutes) * 100;
    const getWidth = (dur: number) => (dur / totalMinutes) * 100;

    const pendingEntries = state.schedule.entries.filter((e) => !e.status || e.status === 'pending');
    const activeEntries = state.schedule.entries.filter((e) => e.status === 'active');
    const doneEntries = state.schedule.entries.filter((e) => e.status === 'completed' || e.status === 'skipped');

    return (
      <div className="bg-slate-800/50 rounded-xl border border-cyan-600/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>⏰</span> 每日时间轴
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-yellow-500/20 rounded border border-yellow-500/50 text-yellow-400">待执行: {pendingEntries.length}</span>
            <span className="px-2 py-1 bg-green-500/20 rounded border border-green-500/50 text-green-400">执行中: {activeEntries.length}</span>
            <span className="px-2 py-1 bg-blue-500/20 rounded border border-blue-500/50 text-blue-400">已完成: {doneEntries.length}</span>
          </div>
        </div>

        <div className="relative">
          <div className="flex border-b border-slate-700 pb-1 mb-2">
            {Array.from({ length: hours }, (_, i) => (
              <div key={i} style={{ width: `${hourWidth}%` }} className="text-[9px] text-gray-500 text-center border-r border-slate-700/50 last:border-r-0">
                {i.toString().padStart(2, '0')}
              </div>
            ))}
          </div>

          {state.students.slice(0, 6).map((student) => (
            <div key={student.id} className="relative h-8 flex items-center border-b border-slate-700/50">
            <div className="w-16 text-xs text-gray-400 truncate pr-2 shrink-0" title={student.name}>
              {student.avatar} {student.name.split('·')[0]}
            </div>
            <div className="relative flex-1 h-6 bg-slate-900/50 rounded">
              {getScheduleForStudent(student.id).map((entry) => {
                const status = getScheduleStatusLabel(entry.status);
                return (
                  <div
                    key={entry.id}
                    title={`${ACTIVITY_NAMES[entry.activity]} ${formatGameTime(entry.startTime)}-${formatGameTime(entry.startTime + entry.duration)} (${status.text})${entry.result ? ': ' + entry.result : ''}`}
                    className={`absolute h-full top-0 rounded bg-gradient-to-r ${ACTIVITY_COLORS[entry.activity]} opacity-${entry.status === 'completed' ? '50' : entry.status === 'skipped' ? '30' : '90'} border border-white/20 cursor-pointer hover:scale-y-110 transition-transform flex items-center justify-center text-[9px] text-white font-bold overflow-hidden`}
                    style={{
                      left: `${getPosition(entry.startTime)}%`,
                      width: `${getWidth(entry.duration)}%`,
                    }}
                    onClick={() => entry.status !== 'active' && entry.status !== 'completed' && removeScheduleEntry(entry.id)}
                  >
                    {ACTIVITY_ICONS[entry.activity]}
                  </div>
                );
              })}
              <div
                className="absolute top-0 h-full w-0.5 bg-red-500 z-10 shadow-[0_0_6px_rgba(239,68,68,0.8)]}"
                style={{ left: `${getPosition(currentTime)}%` }}
              />
            </div>
            </div>
          ))}

          {state.students.length > 6 && (
            <div className="text-center text-xs text-gray-500 py-2">
              还有 {state.students.length - 6} 名学员未显示...
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudentCard = (student: Student) => {
    const fatiguePercent = (student.fatigue / student.maxFatigue) * 100;
    const fatigueLevel = getFatigueLevel(student.fatigue, student.maxFatigue);
    const fatigueLevelName = getFatigueLevelName(fatigueLevel);
    const efficiency = getEfficiencyMultiplier(student.fatigue, student.maxFatigue, student.morale);
    const schedule = getScheduleForStudent(student.id);

    return (
      <div
        key={student.id}
        className={`bg-slate-900/50 rounded-xl p-4 border-2 transition-all cursor-pointer ${
          selectedStudent === student.id
            ? 'border-yellow-400 bg-yellow-900/20'
            : 'border-slate-700 hover:border-purple-500'
        }`}
        onClick={() => setSelectedStudent(student.id === selectedStudent ? null : student.id)}
      >
        <div className="flex items-start gap-3">
          <span className="text-4xl">{student.avatar}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white truncate">{student.name.split('·')[0]}</div>
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded" style={{ color: RARITY_COLORS[student.rarity] }}>
                Lv.{student.level}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs mt-1">
              <span>{ELEMENT_ICONS[student.element]}</span>
              <span className="text-gray-400">
                {student.status === 'idle' ? '空闲' : student.status === 'studying' ? '学习中' : student.status === 'resting' ? '休息中' : student.status === 'training' ? '训练中' : '试炼中'}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">疲劳值</span>
                <span style={{ color: getFatigueLevelColor(fatigueLevel) }}>
                  {student.fatigue} / {student.maxFatigue}
                </span>
              </div>
              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${fatiguePercent}%`, backgroundColor: getFatigueBarColor(student) }}
                />
              </div>
              <div className="flex justify-between text-[10px] mt-1">
                <span style={{ color: getFatigueLevelColor(fatigueLevel) }}>{fatigueLevelName}</span>
                <span className={efficiency >= 1 ? 'text-green-400' : 'text-red-400'}>
                  效率: {Math.round(efficiency * 100)}%
                </span>
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">士气</span>
                <span className={student.morale >= 80 ? 'text-green-400' : student.morale >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                  {student.morale}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${student.morale >= 80 ? 'bg-green-500' : student.morale >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${student.morale}%` }}
                />
              </div>
            </div>

            {schedule.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-gray-400 mb-2">今日安排:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {schedule.map((entry) => {
                    const statusInfo = getScheduleStatusLabel(entry.status);
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between text-xs p-2 rounded bg-gradient-to-r ${ACTIVITY_COLORS[entry.activity]} ${entry.status === 'completed' || entry.status === 'skipped' ? 'opacity-60' : ''} relative`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{ACTIVITY_ICONS[entry.activity]}</span>
                          <span className="text-white font-medium">{ACTIVITY_NAMES[entry.activity]}</span>
                          <span className={`text-[9px] px-1 rounded border ${getStatusBadgeClass(entry.status)} ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                        <div className="text-white/80 text-[10px]">
                          {formatGameTime(entry.startTime)} - {formatGameTime(entry.startTime + entry.duration)}
                        </div>
                        {entry.result && (
                          <div className="col-span-2 mt-1 text-[9px] text-white/70 bg-black/20 rounded px-1">
                            {entry.result}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedStudent === student.id && (
              <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestStudent(student.id, 60);
                  }}
                  disabled={student.status !== 'idle'}
                  className="w-full py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  😴 安排休息 60 分钟
                </button>
                {schedule.filter((e) => e.status !== 'completed' && e.status !== 'skipped').length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        schedule
                          .filter((x) => x.status !== 'completed' && x.status !== 'skipped')
                          .forEach((x) => removeScheduleEntry(x.id));
                        showNotification('🗑️ 已清除该学员排班');
                      }}
                      className="flex-1 py-1.5 rounded text-xs bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      清除排班
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const tiredStudents = state.students.filter((s) => s.fatigue > s.maxFatigue * 0.5);
  const exhaustedStudents = state.students.filter((s) => s.fatigue > s.maxFatigue * 0.8);
  const pendingCount = state.schedule.entries.filter((e) => !e.status || e.status === 'pending').length;
  const completedToday = state.schedule.entries.filter((e) => e.status === 'completed').length;

  return (
    <div className="space-y-4">
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-pulse">
          {notification}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📅</span> 学员排班与疲劳管理
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-800/80 px-4 py-2 rounded-lg border border-cyan-600/50 flex items-center gap-2">
            <span className="text-2xl">{getTimeOfDayIcon(timeOfDay)}</span>
            <div>
              <div className="text-xs text-gray-400">第 {state.day} 天</div>
              <div className="text-lg font-bold text-cyan-400">
                {formatGameTime(currentTime)}
              </div>
            </div>
            <div className="text-xs text-gray-400 ml-2">
              {getTimeOfDayName(timeOfDay)}
            </div>
          </div>

          <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-orange-600/50">
            <span className="text-gray-400 text-sm">待执行: </span>
            <span className="text-yellow-400 font-bold">{pendingCount}</span>
          </div>
          <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-blue-600/50">
            <span className="text-gray-400 text-sm">已完成: </span>
            <span className="text-blue-400 font-bold">{completedToday}</span>
          </div>
          <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-yellow-600/50">
            <span className="text-gray-400 text-sm">疲劳: </span>
            <span className="text-yellow-400 font-bold">{tiredStudents.length}</span>
          </div>
          <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-red-600/50">
            <span className="text-gray-400 text-sm">精疲: </span>
            <span className="text-red-400 font-bold">{exhaustedStudents.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-cyan-600/50 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">自动执行:</span>
              <button
                onClick={() => toggleAutoExecute(!state.schedule.autoExecute)}
                className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
                  state.schedule.autoExecute
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-gray-400'
                }`}
              >
                {state.schedule.autoExecute ? '✅ 开启' : '⏸️ 关闭'}
              </button>
            </div>
            <span className="text-xs text-gray-500">每秒推进1分钟</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => advanceMinutes(30)}
              className="px-3 py-1.5 rounded-lg font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white"
            >
              ⏩ +30分
            </button>
            <button
              onClick={() => advanceMinutes(120)}
              className="px-3 py-1.5 rounded-lg font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white"
            >
              ⏩ +2小时
            </button>
            <button
              onClick={() => advanceMinutes(480)}
              className="px-3 py-1.5 rounded-lg font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white"
            >
              ⏩ +8小时
            </button>
            <button
              onClick={() => {
                triggerNewDay();
                showNotification('🌅 新的一天开始了！');
              }}
              className="px-4 py-1.5 rounded-lg font-bold text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
            >
              🌅 进入下一天
            </button>
            <button
              onClick={() => setShowBulkRest(true)}
              disabled={tiredStudents.filter((s) => s.status === 'idle').length === 0}
              className="px-4 py-1.5 rounded-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              😴 批量休息
            </button>
          </div>
        </div>
      </div>

      {renderTimeline()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/50 rounded-xl border border-purple-600/50 p-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span>👥</span> 学员状态列表
            </h3>
            {state.students.length === 0 ? (
              <div className="text-center py-8 bg-slate-900/30 rounded-lg border-2 border-dashed border-purple-600/30">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-gray-500">学院还没有学员</p>
                <p className="text-xs text-gray-600 mt-1">先去招募学员吧</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto">
                {state.students.map((student) => renderStudentCard(student))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl border border-cyan-600/50 p-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span>➕</span> 添加排班
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-cyan-300 mb-1 block">选择活动</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['study', 'train', 'dungeon', 'rest', 'idle'] as ActivityType[]).map((activity) => (
                    <button
                      key={activity}
                      onClick={() => setSelectedActivity(activity)}
                      className={`p-2 rounded-lg border-2 transition-all text-center ${
                        selectedActivity === activity
                          ? 'border-yellow-400 bg-yellow-900/30'
                          : 'border-slate-600 bg-slate-800/50 hover:border-cyan-400'
                      }`}
                    >
                      <div className="text-xl">{ACTIVITY_ICONS[activity]}</div>
                      <div className="text-xs text-white mt-1">{ACTIVITY_NAMES[activity]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedActivity === 'study' && (
                <div>
                  <label className="text-sm text-cyan-300 mb-1 block">选择课程</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {Object.values(COURSE_DEFS).map((course) => {
                      const canTake = selectedStudent
                        ? state.students.find((s) => s.id === selectedStudent)?.level! >= course.requiredLevel
                        : true;
                      return (
                        <button
                          key={course.id}
                          onClick={() => setSelectedCourse(course.id)}
                          disabled={!canTake}
                          className={`p-2 rounded-lg border-2 transition-all text-left text-xs ${
                            selectedCourse === course.id
                              ? 'border-yellow-400 bg-yellow-900/30'
                              : canTake
                              ? 'border-slate-600 bg-slate-800/50 hover:border-cyan-400'
                              : 'border-slate-700 bg-slate-800/20 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-lg">{course.icon}</div>
                          <div className="text-white truncate">{course.name}</div>
                          <div className="text-gray-400">Lv.{course.requiredLevel}+</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedActivity === 'dungeon' && (
                <div>
                  <label className="text-sm text-cyan-300 mb-1 block">选择副本</label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {DUNGEON_DEFS.map((dungeon) => {
                      const canEnter = selectedStudent
                        ? state.students.find((s) => s.id === selectedStudent)?.level! >= dungeon.requiredLevel
                        : true;
                      return (
                        <button
                          key={dungeon.id}
                          onClick={() => setSelectedDungeon(dungeon.id)}
                          disabled={!canEnter}
                          className={`p-2 rounded-lg border-2 transition-all text-left text-xs ${
                            selectedDungeon === dungeon.id
                              ? 'border-yellow-400 bg-yellow-900/30'
                              : canEnter
                              ? 'border-slate-600 bg-slate-800/50 hover:border-cyan-400'
                              : 'border-slate-700 bg-slate-800/20 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white">{dungeon.name}</span>
                            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">
                              {DIFFICULTY_NAMES[dungeon.difficulty]}
                            </span>
                          </div>
                          <div className="text-gray-400 mt-1">需要 Lv.{dungeon.requiredLevel}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-cyan-300 mb-1 block">开始时间</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      max={TIME_CONFIG.MINUTES_PER_DAY - 1}
                      value={startTime}
                      onChange={(e) => setStartTime(Math.max(0, Math.min(TIME_CONFIG.MINUTES_PER_DAY - 1, parseInt(e.target.value) || 0)))}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm"
                      placeholder="分"
                    />
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">{formatGameTime(startTime)}</div>
                </div>
                <div>
                  <label className="text-sm text-cyan-300 mb-1 block">持续时间</label>
                  <input
                    type="number"
                    min="10"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(10, parseInt(e.target.value) || 10))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm"
                    placeholder="分"
                  />
                  <div className="text-[9px] text-gray-500 mt-0.5">{formatGameTime(duration)} ~ {formatGameTime(startTime + duration)}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[30, 60, 120, 180].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-1 rounded text-xs ${
                      duration === d ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {d}分
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[480, 540, 600, 780].map((t, i) => (
                  <div key={t} className="col-span-1 grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setStartTime(t)}
                      className={`py-1 rounded text-xs ${
                        startTime === t ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {['8:00', '9:00', '10:00', '13:00'][i]}
                    </button>
                    <button
                      onClick={() => setStartTime(t + 60)}
                      className={`py-1 rounded text-xs ${
                        startTime === t + 60 ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {['9:00', '10:00', '11:00', '14:00'][i]}
                    </button>
                  </div>
                ))}
              </div>

              {selectedActivity && (
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-600">
                  <div className="text-xs text-gray-400">
                    {selectedActivity === 'study' && selectedCourse && (
                      <div>
                        <span className="text-yellow-400">预计疲劳消耗: </span>
                        +{calculateStudyFatigueCost(duration)} 点
                      </div>
                    )}
                    {selectedActivity === 'train' && (
                      <div>
                        <span className="text-yellow-400">预计疲劳消耗: </span>
                        +{Math.floor(duration * 1.5 / 60)} 点
                        <span className="ml-2 text-green-400">预计属性提升</span>
                      </div>
                    )}
                    {selectedActivity === 'dungeon' && selectedDungeon && (
                      <div>
                        <span className="text-yellow-400">预计疲劳消耗: </span>
                        +{calculateDungeonFatigueCost(DUNGEON_DEFS.find((d) => d.id === selectedDungeon)?.difficulty || 'easy')} 点
                        <span className="ml-2 text-green-400">可能获得奖励</span>
                      </div>
                    )}
                    {selectedActivity === 'rest' && (
                      <div>
                        <span className="text-green-400">预计疲劳恢复: </span>
                        -{calculateRestFatigueRecovery(duration, dormLevel)} 点
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleAddSchedule}
                disabled={!selectedStudent || !selectedActivity}
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ➕ 添加排班
              </button>

              {state.schedule.entries.length > 0 && (
                <button
                  onClick={() => {
                    clearSchedule();
                    showNotification('🗑️ 已清空所有排班');
                  }}
                  className="w-full py-2 rounded-lg text-sm font-bold bg-slate-700 hover:bg-slate-600 text-white"
                >
                  🗑️ 清空所有排班
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-yellow-600/50 p-4">
            <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <span>💡</span> 疲劳说明
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
                <span className="text-green-400">精力充沛</span>
                <span className="text-gray-400">0-30% · 效率 100%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
                <span className="text-blue-400">状态良好</span>
                <span className="text-gray-400">30-60% · 效率 100%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                <span className="text-yellow-400">疲劳</span>
                <span className="text-gray-400">60-85% · 效率 70%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-red-400">精疲力竭</span>
                <span className="text-gray-400">85%+ · 效率 40%</span>
              </div>
              <div className="pt-2 border-t border-slate-700 text-xs text-gray-400">
                <p>• 士气 ≥ 80% 时，效率额外 +50%</p>
                <p>• 每日结算可恢复 {30 + dormLevel * 10} 点疲劳</p>
                <p>• 宿舍等级越高，休息恢复越快</p>
                <p>• 点击排班条目可删除（未执行状态）</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBulkRest && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-950 rounded-2xl border-2 border-green-500 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
              <span>😴</span> 批量休息
            </h3>
            <p className="text-gray-300 mb-4">
              将让所有疲劳值超过 50% 且处于空闲状态的学员开始休息。
            </p>
            <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-gray-400">
                符合条件的学员: <span className="text-green-400 font-bold">{tiredStudents.filter((s) => s.status === 'idle').length}</span> 人
              </p>
              <p className="text-sm text-gray-400 mt-1">
                预计每人恢复: <span className="text-green-400 font-bold">{calculateRestFatigueRecovery(60, dormLevel)}</span> 点疲劳
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkRest(false)}
                className="flex-1 py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white"
              >
                取消
              </button>
              <button
                onClick={() => handleBulkRest(60)}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
              >
                确认休息
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { COURSE_DEFS, RARITY_COLORS, ELEMENT_ICONS, ELEMENT_NAMES, ELEMENT_COLORS } from '../data/gameData';
import { Course, CourseType } from '../types/game';
import { formatTime, generateId, getFatigueLevel, getFatigueLevelColor, calculateStudyFatigueCost } from '../utils/gameUtils';

interface Props {}

export function CourseModule({}: Props) {
  const { state, dispatch, canAfford } = useGame();
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);

  const classroom = state.buildings.find((b) => b.type === 'classroom');
  const maxCourses = 1 + (classroom?.level || 0);
  const activeCourses = state.courses.length;

  const idleStudents = state.students.filter((s) => s.status === 'idle');
  const studyingStudents = state.students.filter((s) => s.status === 'studying');

  useEffect(() => {
    if (state.courses.length === 0 && completedCourses.length > 0) {
      setCompletedCourses([]);
    }
  }, [state.courses.length, completedCourses.length]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const startCourse = () => {
    if (!selectedCourseType) return;
    if (selectedStudents.length === 0) return;
    if (activeCourses >= maxCourses) {
      showNotification('⚠️ 教室不足，请升级元素教室');
      return;
    }

    const def = COURSE_DEFS[selectedCourseType];
    const goldCost = def.goldCost * selectedStudents.length;
    const manaCost = def.manaCost * selectedStudents.length;

    if (!canAfford({ gold: goldCost, mana: manaCost })) {
      showNotification('⚠️ 资源不足');
      return;
    }

    const minLevelOk = selectedStudents.every((id) => {
      const s = state.students.find((st) => st.id === id);
      return s && s.level >= def.requiredLevel;
    });
    if (!minLevelOk) {
      showNotification(`⚠️ 部分学员等级不足（需要 Lv.${def.requiredLevel}）`);
      return;
    }

    const fatigueCost = calculateStudyFatigueCost(def.duration);
    const exhaustedStudents = selectedStudents.filter((id) => {
      const s = state.students.find((st) => st.id === id);
      return s && s.fatigue + fatigueCost > s.maxFatigue * 0.85;
    });
    if (exhaustedStudents.length > 0) {
      showNotification(`⚠️ ${exhaustedStudents.length} 名学员过于疲劳，学习效率将大幅降低`);
    }

    const tiredStudents = selectedStudents.filter((id) => {
      const s = state.students.find((st) => st.id === id);
      return s && s.fatigue > s.maxFatigue * 0.5;
    });
    if (tiredStudents.length > 0 && exhaustedStudents.length === 0) {
      showNotification(`💡 ${tiredStudents.length} 名学员状态不佳，建议先休息`);
    }

    dispatch({ type: 'SPEND_RESOURCES', resources: { gold: goldCost, mana: manaCost } });

    const newCourse: Course = {
      id: generateId(),
      courseType: selectedCourseType,
      studentIds: [...selectedStudents],
      startTime: Date.now(),
      duration: def.duration,
      progress: 0,
    };
    dispatch({ type: 'ADD_COURSE', course: newCourse });

    for (const studentId of selectedStudents) {
      const student = state.students.find((s) => s.id === studentId);
      if (student) {
        dispatch({
          type: 'UPDATE_STUDENT',
          student: { ...student, status: 'studying', currentCourseId: newCourse.id },
        });
      }
    }

    setSelectedCourseType(null);
    setSelectedStudents([]);
    showNotification(`🎓 ${def.name} 课程已开始！`);
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
          <span>📖</span> 课程安排
        </h2>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800/80 px-4 py-2 rounded-lg border border-blue-600/50">
            <span className="text-gray-400 text-sm">课程槽位: </span>
            <span className="text-yellow-400 font-bold">
              {activeCourses} / {maxCourses}
            </span>
          </div>
        </div>
      </div>

      {state.courses.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span>⏳</span> 进行中的课程
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.courses.map((course) => {
              const def = COURSE_DEFS[course.courseType];
              const percent = (course.progress / course.duration) * 100;
              const remaining = course.duration - course.progress;
              return (
                <div
                  key={course.id}
                  className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl border-2 border-blue-500/50 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-3xl">{def.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{def.name}</h4>
                      <p className="text-xs text-gray-400">
                        {course.studentIds.length} 名学员学习中
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-300">{Math.floor(percent)}%</span>
                      <span className="text-gray-400">剩余 {formatTime(remaining)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {course.studentIds.map((sid) => {
                      const s = state.students.find((st) => st.id === sid);
                      return s ? (
                        <span
                          key={sid}
                          className="text-xs bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ borderLeft: `3px solid ${RARITY_COLORS[s.rarity]}` }}
                        >
                          {s.avatar} {s.name.split('·')[0]}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-xl border border-purple-600/50 p-4">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <span>📚</span> 开设新课程
        </h3>

        <div className="mb-4">
          <h4 className="text-sm text-purple-300 mb-2">选择课程类型</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.values(COURSE_DEFS).map((def) => {
              const isSelected = selectedCourseType === def.id;
              const levelOk = idleStudents.some((s) => s.level >= def.requiredLevel);
              return (
                <button
                  key={def.id}
                  onClick={() => setSelectedCourseType(def.id)}
                  disabled={!levelOk}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-900/30'
                      : levelOk
                      ? 'border-slate-600 bg-slate-800/50 hover:border-purple-400'
                      : 'border-slate-700 bg-slate-800/20 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-2xl mb-1">{def.icon}</div>
                  <div className="font-bold text-white text-sm truncate">{def.name}</div>
                  <div className="text-xs text-gray-400 mt-1">Lv.{def.requiredLevel}+</div>
                  <div className="text-xs text-yellow-400 mt-1">💰{def.goldCost} 💎{def.manaCost}</div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedCourseType && (
          <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-purple-500/30">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{COURSE_DEFS[selectedCourseType].icon}</span>
              <div className="flex-1">
                <h4 className="font-bold text-white text-lg">{COURSE_DEFS[selectedCourseType].name}</h4>
                <p className="text-sm text-gray-400">{COURSE_DEFS[selectedCourseType].description}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <span className="text-blue-400">⏱️ {formatTime(COURSE_DEFS[selectedCourseType].duration)}</span>
                  <span className="text-green-400">📈 经验 +{COURSE_DEFS[selectedCourseType].baseExp}</span>
                  <span className="text-orange-400">
                    😓 疲劳 +{calculateStudyFatigueCost(COURSE_DEFS[selectedCourseType].duration)}
                  </span>
                  {Object.entries(COURSE_DEFS[selectedCourseType].statBoosts).map(([stat, val]) => (
                    <span key={stat} className="text-cyan-400">
                      {stat === 'maxHp' ? 'HP' : stat === 'attack' ? '攻击' : stat === 'defense' ? '防御' : stat === 'magic' ? '魔法' : stat === 'speed' ? '速度' : stat === 'critRate' ? '暴击率' : '暴击伤害'}+{val}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm text-purple-300">选择学员 ({selectedStudents.length}人选中)</h4>
            {selectedStudents.length > 0 && (
              <button
                onClick={() => setSelectedStudents([])}
                className="text-xs text-red-400 hover:text-red-300"
              >
                清空选择
              </button>
            )}
          </div>
          {idleStudents.length === 0 ? (
            <div className="text-center py-6 bg-slate-800/30 rounded-lg border border-dashed border-slate-600">
              <p className="text-gray-500">没有空闲的学员</p>
              <p className="text-xs text-gray-600 mt-1">所有学员都在学习或休息中</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
              {idleStudents.map((student) => {
                const isSelected = selectedStudents.includes(student.id);
                const def = selectedCourseType ? COURSE_DEFS[selectedCourseType] : null;
                const levelOk = !def || student.level >= def.requiredLevel;
                const disabled = !levelOk;
                return (
                  <button
                    key={student.id}
                    onClick={() => !disabled && toggleStudentSelection(student.id)}
                    disabled={disabled}
                    className={`p-2 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-green-400 bg-green-900/30'
                        : disabled
                        ? 'border-slate-700 bg-slate-800/20 opacity-50'
                        : 'border-slate-600 bg-slate-800/50 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{student.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{student.name.split('·')[0]}</div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span style={{ color: RARITY_COLORS[student.rarity] }}>Lv.{student.level}</span>
                          <span style={{ color: ELEMENT_COLORS[student.element] }}>{ELEMENT_ICONS[student.element]}</span>
                        </div>
                        <div className="mt-1">
                          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${(student.fatigue / student.maxFatigue) * 100}%`,
                                backgroundColor: getFatigueLevelColor(getFatigueLevel(student.fatigue, student.maxFatigue)),
                              }}
                            />
                          </div>
                          <div className="text-[8px] text-gray-500 mt-0.5">
                            疲劳: {student.fatigue}/{student.maxFatigue}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-xs text-green-400 text-center mt-1">✓ 已选</div>
                    )}
                    {disabled && def && (
                      <div className="text-xs text-red-400 text-center mt-1">需Lv.{def.requiredLevel}</div>
                    )}
                    {!disabled && student.fatigue > student.maxFatigue * 0.6 && (
                      <div className="text-xs text-yellow-400 text-center mt-1">⚠️ 疲劳</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedCourseType && selectedStudents.length > 0 && (
          <div className="p-3 bg-slate-900/50 rounded-lg mb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm">
                <span className="text-gray-400">总消耗: </span>
                <span className="text-yellow-400 font-bold mr-3">
                  💰 {COURSE_DEFS[selectedCourseType].goldCost * selectedStudents.length}
                </span>
                <span className="text-blue-400 font-bold">
                  💎 {COURSE_DEFS[selectedCourseType].manaCost * selectedStudents.length}
                </span>
              </div>
              <button
                onClick={startCourse}
                disabled={activeCourses >= maxCourses}
                className="px-6 py-2 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                🎓 开始授课
              </button>
            </div>
          </div>
        )}
      </div>

      {studyingStudents.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span>🎒</span> 学习中的学员
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {studyingStudents.map((s) => (
              <div
                key={s.id}
                className="bg-blue-900/30 rounded-lg p-2 border border-blue-500/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{s.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{s.name.split('·')[0]}</div>
                    <div className="text-[10px] text-blue-400">📖 学习中...</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

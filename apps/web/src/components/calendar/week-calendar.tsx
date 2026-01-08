'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Users, GripVertical, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClassSession {
  id: string;
  classId: string;
  className: string;
  color: string;
  instructorName: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookingsCount: number;
  status: string;
}

interface WeekCalendarProps {
  sessions: ClassSession[];
  onAddSession: (date: Date, hour: number) => void;
  onEditSession: (session: ClassSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onMoveSession?: (sessionId: string, newStartTime: Date, newEndTime: Date) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(date: Date): Date[] {
  const week: Date[] = [];
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    week.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return week;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getSessionDuration(startTime: string, endTime: string): number {
  return (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60);
}

export function WeekCalendar({
  sessions,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onMoveSession
}: WeekCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const [draggedSession, setDraggedSession] = useState<ClassSession | null>(null);
  const [dropTarget, setDropTarget] = useState<{ day: number; hour: number } | null>(null);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getSessionsForDayAndHour = useCallback((date: Date, hour: number) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.startTime);
      return (
        sessionDate.getFullYear() === date.getFullYear() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getHours() === hour
      );
    });
  }, [sessions]);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, session: ClassSession) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', session.id);

    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-white shadow-lg rounded-md p-2 text-sm font-medium';
    dragImage.textContent = session.className;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ day: dayIndex, hour });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();

    if (!draggedSession || !onMoveSession) return;

    const targetDate = weekDates[dayIndex];
    const newStartTime = new Date(targetDate);
    newStartTime.setHours(hour, 0, 0, 0);

    const duration = getSessionDuration(draggedSession.startTime, draggedSession.endTime);
    const newEndTime = new Date(newStartTime.getTime() + duration * 60 * 1000);

    onMoveSession(draggedSession.id, newStartTime, newEndTime);

    setDraggedSession(null);
    setDropTarget(null);
  };

  const weekRange = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <h2 className="text-lg font-semibold ml-4">{weekRange}</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          Drag classes to reschedule
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b bg-muted/30">
          <div className="p-2 text-center text-sm font-medium text-muted-foreground border-r">
            Time
          </div>
          {weekDates.map((date, i) => (
            <div
              key={i}
              className={cn(
                'p-2 text-center border-r last:border-r-0',
                isToday(date) && 'bg-primary/10'
              )}
            >
              <div className="text-sm font-medium">{DAYS[i]}</div>
              <div
                className={cn(
                  'text-lg font-bold',
                  isToday(date) && 'text-primary'
                )}
              >
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0" style={{ minHeight: '80px' }}>
              {/* Time Label */}
              <div className="p-1 text-xs text-muted-foreground border-r flex items-start justify-center pt-2">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>

              {/* Day Cells */}
              {weekDates.map((date, dayIndex) => {
                const cellSessions = getSessionsForDayAndHour(date, hour);
                const isDropTarget = dropTarget?.day === dayIndex && dropTarget?.hour === hour;
                const isDragSource = draggedSession && cellSessions.some(s => s.id === draggedSession.id);

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'relative border-r last:border-r-0 p-1 transition-colors',
                      isToday(date) && 'bg-primary/5',
                      isDropTarget && 'bg-primary/20 ring-2 ring-primary ring-inset',
                      isDragSource && 'opacity-50'
                    )}
                    onMouseEnter={() => setHoveredCell({ day: dayIndex, hour })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onDragOver={(e) => handleDragOver(e, dayIndex, hour)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayIndex, hour)}
                  >
                    {/* Add button - show when hovering empty cell OR as small button when has sessions */}
                    {hoveredCell?.day === dayIndex &&
                      hoveredCell?.hour === hour &&
                      !draggedSession && (
                        cellSessions.length === 0 ? (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-muted/50 cursor-pointer z-10"
                            onClick={() => onAddSession(date, hour)}
                          >
                            <Plus className="h-5 w-5 text-muted-foreground" />
                          </div>
                        ) : (
                          <button
                            className="absolute top-1 right-1 z-20 p-1 rounded-full bg-primary text-white shadow-md hover:bg-primary/90 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddSession(date, hour);
                            }}
                            title="Add another class"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )
                      )}

                    {/* Sessions Container - handles multiple sessions */}
                    <div className={cn(
                      'flex gap-1 h-full',
                      cellSessions.length > 2 ? 'flex-wrap' : ''
                    )}>
                      {cellSessions.map((session, idx) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          isCompact={cellSessions.length > 1}
                          isVeryCompact={cellSessions.length > 2}
                          onEdit={() => onEditSession(session)}
                          onDelete={() => onDeleteSession(session.id)}
                          onDragStart={(e) => handleDragStart(e, session)}
                          onDragEnd={handleDragEnd}
                          style={{
                            width: cellSessions.length === 1
                              ? '100%'
                              : cellSessions.length === 2
                                ? 'calc(50% - 2px)'
                                : 'calc(50% - 2px)',
                            minWidth: cellSessions.length > 2 ? '45%' : undefined
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  isCompact,
  isVeryCompact,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  style,
}: {
  session: ClassSession;
  isCompact?: boolean;
  isVeryCompact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  style?: React.CSSProperties;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-md overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:shadow-md group',
        isVeryCompact ? 'p-1' : 'p-1.5'
      )}
      style={{
        backgroundColor: session.color + '20',
        borderLeft: `3px solid ${session.color}`,
        ...style
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      {/* Drag handle */}
      <div className="flex items-start gap-1">
        <GripVertical
          className={cn(
            'flex-shrink-0 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity',
            isVeryCompact ? 'h-3 w-3' : 'h-4 w-4'
          )}
        />
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'font-medium truncate',
              isVeryCompact ? 'text-[10px]' : isCompact ? 'text-xs' : 'text-xs'
            )}
            style={{ color: session.color }}
          >
            {session.className}
          </div>
          {!isVeryCompact && (
            <div className="text-muted-foreground truncate text-[10px]">
              {formatTime(session.startTime)}
            </div>
          )}
          {!isCompact && !isVeryCompact && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
              <Users className="h-3 w-3" />
              {session.bookingsCount}/{session.capacity}
            </div>
          )}
          {isCompact && !isVeryCompact && (
            <div className="text-[9px] text-muted-foreground">
              {session.bookingsCount}/{session.capacity}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && !isVeryCompact && (
        <div className="absolute top-1 right-1 flex gap-0.5 z-20">
          <button
            className="p-1 rounded bg-white shadow-sm hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 className="h-3 w-3 text-gray-600" />
          </button>
          <button
            className="p-1 rounded bg-white shadow-sm hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 text-red-600" />
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { BookClassButton } from './book-class-button';

interface ClassSession {
  id: string;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
  spotsLeft: number;
  class: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    capacity: number;
    durationMinutes: number;
  };
  instructor: {
    firstName: string;
    lastName: string;
  } | null;
}

interface ClassCalendarProps {
  sessions: ClassSession[];
  memberId: string;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM

function formatTime(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const day = baseDate.getDay();
  const diff = baseDate.getDate() - day; // Start from Sunday

  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(diff + i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDayHeader(date: Date): { day: string; date: string } {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    day: days[date.getDay()],
    date: date.getDate().toString(),
  };
}

export function ClassCalendar({ sessions, memberId }: ClassCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    return getWeekDates(now)[0];
  });
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);

  const weekDates = getWeekDates(currentWeekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    setCurrentWeekStart(getWeekDates(new Date())[0]);
  };

  const getSessionsForDateAndHour = (date: Date, hour: number) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.startTime);
      return isSameDay(sessionDate, date) && sessionDate.getHours() === hour;
    });
  };

  const formatMonthYear = () => {
    const firstDay = weekDates[0];
    const lastDay = weekDates[6];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
    }
    return `${monthNames[firstDay.getMonth()]} - ${monthNames[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{formatMonthYear()}</h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 border-b">
              <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r">
                Time
              </div>
              {weekDates.map((date) => {
                const { day, date: dateNum } = formatDayHeader(date);
                const isToday = isSameDay(date, today);
                return (
                  <div
                    key={date.toISOString()}
                    className={`p-3 text-center border-r last:border-r-0 ${
                      isToday ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="text-sm text-muted-foreground">{day}</div>
                    <div
                      className={`text-lg font-semibold ${
                        isToday
                          ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                          : ''
                      }`}
                    >
                      {dateNum}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="max-h-[600px] overflow-y-auto">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 min-h-[80px]">
                  <div className="p-2 text-xs text-muted-foreground border-r flex items-start justify-center">
                    {formatTime(hour)}
                  </div>
                  {weekDates.map((date) => {
                    const daySessions = getSessionsForDateAndHour(date, hour);
                    const isPast = date < today;
                    return (
                      <div
                        key={`${date.toISOString()}-${hour}`}
                        className={`p-1 border-r last:border-r-0 ${
                          isPast ? 'bg-muted/30' : ''
                        } ${isSameDay(date, today) ? 'bg-primary/5' : ''}`}
                      >
                        {daySessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className={`w-full text-left p-2 rounded text-xs mb-1 transition-colors ${
                              session.isBooked
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:opacity-80'
                            }`}
                            style={{
                              backgroundColor: session.isBooked
                                ? undefined
                                : session.class.color || '#3b82f6',
                              color: 'white',
                            }}
                          >
                            <div className="font-medium truncate">
                              {session.class.name}
                            </div>
                            <div className="opacity-80 truncate">
                              {new Date(session.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                            {session.isBooked && (
                              <div className="text-[10px] mt-1 opacity-90">✓ Booked</div>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Session Details Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSession(null)}
        >
          <Card
            className="w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: selectedSession.class.color || '#3b82f6' }}
                />
                <div>
                  <h3 className="text-xl font-semibold">{selectedSession.class.name}</h3>
                  {selectedSession.class.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedSession.class.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(selectedSession.startTime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(selectedSession.startTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedSession.spotsLeft > 0
                      ? `${selectedSession.spotsLeft} spots available`
                      : 'Class is full'}
                  </span>
                </div>
                {selectedSession.instructor && (
                  <div className="text-muted-foreground">
                    Instructor: {selectedSession.instructor.firstName}{' '}
                    {selectedSession.instructor.lastName}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <BookClassButton
                  sessionId={selectedSession.id}
                  memberId={memberId}
                  isBooked={selectedSession.isBooked}
                  isFull={selectedSession.spotsLeft <= 0}
                />
                <Button
                  variant="outline"
                  onClick={() => setSelectedSession(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Your bookings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#10b981]" />
          <span>Yoga</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#ef4444]" />
          <span>HIIT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#f59e0b]" />
          <span>Spin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#8b5cf6]" />
          <span>Strength</span>
        </div>
      </div>
    </div>
  );
}

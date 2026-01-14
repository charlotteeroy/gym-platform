'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Clock, Users, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WeekCalendar } from '@/components/calendar/week-calendar';
import { SessionDialog } from '@/components/calendar/session-dialog';
import { DeleteSessionDialog } from '@/components/calendar/delete-dialog';
import { useToast } from '@/components/ui/use-toast';

interface ClassType {
  id: string;
  name: string;
  description: string;
  color: string;
  capacity: number;
  durationMinutes: number;
  instructorId: string;
  instructorName: string;
  sessionCount: number;
}

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

export default function AdminClassesPage() {
  const [view, setView] = useState<'schedule' | 'types'>('schedule');
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Dialog states
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [defaultHour, setDefaultHour] = useState<number | undefined>();

  // Fetch class types
  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/classes/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchClasses(), fetchSessions()]).finally(() => setLoading(false));
  }, [fetchClasses, fetchSessions]);

  // Handle adding a session (works even if slot has existing sessions)
  const handleAddSession = (date: Date, hour: number) => {
    setSelectedSession(null);
    setDefaultDate(date);
    setDefaultHour(hour);
    setSessionDialogOpen(true);
  };

  // Handle moving a session via drag and drop
  const handleMoveSession = async (sessionId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      const res = await fetch(`/api/classes/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to move session');
      }

      const updatedSession = await res.json();
      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));

      toast({
        title: 'Session moved',
        description: `${updatedSession.className} has been rescheduled.`,
      });
    } catch (error) {
      console.error('Failed to move session:', error);
      toast({
        title: 'Failed to move session',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle editing a session
  const handleEditSession = (session: ClassSession) => {
    setSelectedSession(session);
    setDefaultDate(undefined);
    setDefaultHour(undefined);
    setSessionDialogOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (session: ClassSession) => {
    setSelectedSession(session);
    setDeleteDialogOpen(true);
  };

  // Save session (create or update)
  const handleSaveSession = async (data: {
    id?: string;
    classId: string;
    startTime: string;
    endTime: string;
  }) => {
    const isEdit = !!data.id;
    const url = isEdit ? `/api/classes/sessions/${data.id}` : '/api/classes/sessions';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error('Failed to save session');
    }

    const savedSession = await res.json();

    if (isEdit) {
      setSessions((prev) => prev.map((s) => (s.id === savedSession.id ? savedSession : s)));
    } else {
      setSessions((prev) => [...prev, savedSession]);
    }

    toast({
      title: isEdit ? 'Session updated' : 'Session created',
      description: `${savedSession.className} has been ${isEdit ? 'updated' : 'scheduled'}.`,
    });
  };

  // Delete session
  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    const res = await fetch(`/api/classes/sessions/${selectedSession.id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error('Failed to delete session');
    }

    setSessions((prev) => prev.filter((s) => s.id !== selectedSession.id));

    toast({
      title: 'Session deleted',
      description: `${selectedSession.className} has been removed from the schedule.`,
    });
  };

  if (loading) {
    return (
      <>
        <Header title="Classes" description="Manage your class schedule and types" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Classes" description="Manage your class schedule and types" />

      <div className="p-6 space-y-6">
        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={view === 'schedule' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('schedule')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
            <Button
              variant={view === 'types' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('types')}
            >
              Class Types
            </Button>
          </div>
          <Button
            onClick={() => {
              if (view === 'schedule') {
                setSelectedSession(null);
                setDefaultDate(new Date());
                setDefaultHour(9);
                setSessionDialogOpen(true);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {view === 'schedule' ? 'Add Session' : 'Add Class Type'}
          </Button>
        </div>

        {view === 'schedule' ? (
          // Calendar Schedule View
          classes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No class types yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create class types first, then add them to your schedule.
                </p>
                <Button onClick={() => setView('types')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Class Type
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-card rounded-lg border p-4" style={{ minHeight: '600px' }}>
              <WeekCalendar
                sessions={sessions}
                onAddSession={handleAddSession}
                onEditSession={handleEditSession}
                onDeleteSession={(id) => {
                  const session = sessions.find((s) => s.id === id);
                  if (session) handleDeleteClick(session);
                }}
                onMoveSession={handleMoveSession}
              />
            </div>
          )
        ) : (
          // Class Types View
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No class types yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first class type to start scheduling.
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Class Type
                  </Button>
                </CardContent>
              </Card>
            ) : (
              classes.map((classType) => (
                <Card key={classType.id} className="group relative">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: classType.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{classType.name}</CardTitle>
                        <CardDescription className="truncate">
                          {classType.instructorName}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {classType.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {classType.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{classType.durationMinutes} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{classType.capacity} spots</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {classType.sessionCount} sessions scheduled
                    </div>
                  </CardContent>

                  {/* Hover actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Session Dialog */}
      <SessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        classTypes={classes}
        session={
          selectedSession
            ? {
                id: selectedSession.id,
                classId: selectedSession.classId,
                startTime: selectedSession.startTime,
                endTime: selectedSession.endTime,
              }
            : null
        }
        defaultDate={defaultDate}
        defaultHour={defaultHour}
        onSave={handleSaveSession}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSessionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        sessionName={selectedSession?.className || ''}
        bookingsCount={selectedSession?.bookingsCount || 0}
        onConfirm={handleDeleteSession}
      />
    </>
  );
}

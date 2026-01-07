'use client';

import { useState } from 'react';
import { Plus, Calendar, Clock, Users } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Placeholder - will be replaced with real data
const classes: Array<{
  id: string;
  name: string;
  instructor: string;
  capacity: number;
  duration: number;
  color: string;
}> = [];

const upcomingSessions: Array<{
  id: string;
  className: string;
  instructor: string;
  startTime: Date;
  endTime: Date;
  booked: number;
  capacity: number;
}> = [];

export default function ClassesPage() {
  const [view, setView] = useState<'schedule' | 'types'>('schedule');

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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {view === 'schedule' ? 'Add Session' : 'Add Class Type'}
          </Button>
        </div>

        {view === 'schedule' ? (
          // Schedule View
          upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No classes scheduled</h3>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.map((session) => (
                <Card key={session.id} className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{session.className}</CardTitle>
                    <p className="text-sm text-muted-foreground">with {session.instructor}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {session.startTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {session.booked} / {session.capacity} spots
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          // Class Types View
          classes.length === 0 ? (
            <Card>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((classType) => (
                <Card key={classType.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: classType.color || '#3b82f6' }}
                      />
                      <CardTitle className="text-lg">{classType.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{classType.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{classType.capacity} spots</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}

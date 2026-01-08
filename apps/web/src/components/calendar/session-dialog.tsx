'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ClassType {
  id: string;
  name: string;
  color: string;
  capacity: number;
  durationMinutes: number;
  instructorId: string;
  instructorName: string;
}

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classTypes: ClassType[];
  session?: {
    id: string;
    classId: string;
    startTime: string;
    endTime: string;
  } | null;
  defaultDate?: Date;
  defaultHour?: number;
  onSave: (data: {
    id?: string;
    classId: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
}

export function SessionDialog({
  open,
  onOpenChange,
  classTypes,
  session,
  defaultDate,
  defaultHour,
  onSave,
}: SessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(session?.classId || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const selectedClass = classTypes.find((c) => c.id === selectedClassId);

  useEffect(() => {
    if (session) {
      setSelectedClassId(session.classId);
      const startDate = new Date(session.startTime);
      setDate(startDate.toISOString().split('T')[0]);
      setTime(
        `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
      );
    } else if (defaultDate) {
      setDate(defaultDate.toISOString().split('T')[0]);
      setTime(defaultHour !== undefined ? `${String(defaultHour).padStart(2, '0')}:00` : '09:00');
      setSelectedClassId(classTypes[0]?.id || '');
    }
  }, [session, defaultDate, defaultHour, classTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !date || !time) return;

    setLoading(true);
    try {
      const startTime = new Date(`${date}T${time}:00`);
      const endTime = new Date(startTime.getTime() + selectedClass.durationMinutes * 60 * 1000);

      await onSave({
        id: session?.id,
        classId: selectedClassId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{session ? 'Edit Class Session' : 'Add Class Session'}</DialogTitle>
          <DialogDescription>
            {session
              ? 'Update the details for this class session.'
              : 'Schedule a new class session.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class">Class Type</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classTypes.map((classType) => (
                  <SelectItem key={classType.id} value={classType.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: classType.color }}
                      />
                      <span>{classType.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({classType.durationMinutes}min)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClass && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <div>Instructor: {selectedClass.instructorName}</div>
              <div>Duration: {selectedClass.durationMinutes} minutes</div>
              <div>Capacity: {selectedClass.capacity} spots</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          {selectedClass && date && time && (
            <div className="text-sm text-muted-foreground">
              Ends at:{' '}
              {new Date(
                new Date(`${date}T${time}:00`).getTime() +
                  selectedClass.durationMinutes * 60 * 1000
              ).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedClassId || !date || !time}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {session ? 'Update Session' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, Loader2, Copy, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

interface OpeningHour {
  id: string | null;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return {
    value: time,
    label: `${hour12}:${minutes} ${ampm}`,
  };
});

export default function OpeningHoursPage() {
  const [hours, setHours] = useState<OpeningHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/gym/hours');
      const data = await response.json();

      if (data.success) {
        setHours(data.data);
      } else {
        setError(data.error?.message || 'Failed to load opening hours');
      }
    } catch {
      setError('Failed to load opening hours');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/gym/hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });

      const data = await response.json();

      if (data.success) {
        setHours(data.data);
        setSuccessMessage('Opening hours saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error?.message || 'Failed to save opening hours');
      }
    } catch {
      setError('Failed to save opening hours');
    } finally {
      setIsSaving(false);
    }
  };

  const updateHour = (dayOfWeek: number, field: keyof OpeningHour, value: string | boolean | null) => {
    setHours(hours.map(h =>
      h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
    ));
  };

  const toggleClosed = (dayOfWeek: number) => {
    const hour = hours.find(h => h.dayOfWeek === dayOfWeek);
    if (!hour) return;

    setHours(hours.map(h =>
      h.dayOfWeek === dayOfWeek
        ? {
            ...h,
            isClosed: !h.isClosed,
            openTime: !h.isClosed ? null : '06:00',
            closeTime: !h.isClosed ? null : '22:00',
          }
        : h
    ));
  };

  const copyToAll = (dayOfWeek: number) => {
    const sourceHour = hours.find(h => h.dayOfWeek === dayOfWeek);
    if (!sourceHour) return;

    setHours(hours.map(h => ({
      ...h,
      openTime: sourceHour.openTime,
      closeTime: sourceHour.closeTime,
      isClosed: sourceHour.isClosed,
    })));
  };

  const copyToWeekdays = (dayOfWeek: number) => {
    const sourceHour = hours.find(h => h.dayOfWeek === dayOfWeek);
    if (!sourceHour) return;

    setHours(hours.map(h => {
      // Weekdays are 1-5 (Mon-Fri)
      if (h.dayOfWeek >= 1 && h.dayOfWeek <= 5) {
        return {
          ...h,
          openTime: sourceHour.openTime,
          closeTime: sourceHour.closeTime,
          isClosed: sourceHour.isClosed,
        };
      }
      return h;
    }));
  };

  if (isLoading) {
    return (
      <>
        <Header title="Opening Hours" description="Set your gym's operating hours" />
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Opening Hours" description="Set your gym's operating hours" />

      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        {/* Back Link */}
        <Link
          href="/admin/gym"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gym Settings
        </Link>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Hours Editor */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Weekly Schedule</h2>
                <p className="text-sm text-slate-500">Configure your gym's opening and closing times</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {hours.map((hour) => {
              const day = DAYS.find(d => d.value === hour.dayOfWeek);
              return (
                <div
                  key={hour.dayOfWeek}
                  className={`p-4 md:p-5 ${hour.isClosed ? 'bg-slate-50' : ''}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Day Name */}
                    <div className="w-full md:w-32 flex items-center justify-between md:block">
                      <span className="font-medium text-slate-900">{day?.label}</span>
                      <div className="md:hidden">
                        <Switch
                          checked={!hour.isClosed}
                          onCheckedChange={() => toggleClosed(hour.dayOfWeek)}
                        />
                      </div>
                    </div>

                    {/* Open/Closed Toggle (Desktop) */}
                    <div className="hidden md:flex items-center gap-2 w-24">
                      <Switch
                        checked={!hour.isClosed}
                        onCheckedChange={() => toggleClosed(hour.dayOfWeek)}
                      />
                      <span className={`text-sm ${hour.isClosed ? 'text-slate-400' : 'text-emerald-600 font-medium'}`}>
                        {hour.isClosed ? 'Closed' : 'Open'}
                      </span>
                    </div>

                    {/* Time Selectors */}
                    {!hour.isClosed ? (
                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex-1">
                          <Label htmlFor={`open-${hour.dayOfWeek}`} className="text-xs text-slate-500 mb-1 block">
                            Opens
                          </Label>
                          <select
                            id={`open-${hour.dayOfWeek}`}
                            value={hour.openTime || ''}
                            onChange={(e) => updateHour(hour.dayOfWeek, 'openTime', e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                          >
                            {TIME_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-slate-400 mt-5">to</span>

                        <div className="flex-1">
                          <Label htmlFor={`close-${hour.dayOfWeek}`} className="text-xs text-slate-500 mb-1 block">
                            Closes
                          </Label>
                          <select
                            id={`close-${hour.dayOfWeek}`}
                            value={hour.closeTime || ''}
                            onChange={(e) => updateHour(hour.dayOfWeek, 'closeTime', e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                          >
                            {TIME_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Copy Actions */}
                        <div className="flex gap-1 mt-5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToWeekdays(hour.dayOfWeek)}
                            title="Copy to weekdays"
                          >
                            <Copy className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center">
                        <span className="text-slate-400 italic">Closed all day</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800 rounded-xl h-11 px-6"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Hours
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

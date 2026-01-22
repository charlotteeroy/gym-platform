'use client';

import { useState, useEffect } from 'react';
import { Loader2, Users, Instagram, Linkedin, Award, Dumbbell } from 'lucide-react';
import Link from 'next/link';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  instagramUrl: string | null;
  linkedinUrl: string | null;
  instructorClasses: {
    id: string;
    name: string;
  }[];
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  INSTRUCTOR: 'Trainer',
};

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/staff');
      const data = await response.json();

      if (data.success) {
        setTrainers(data.data);
      } else {
        setError(data.error?.message || 'Failed to load trainers');
      }
    } catch {
      setError('Failed to load trainers');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <Users className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Our Trainers</h1>
              <p className="text-slate-500">Meet the team that will help you achieve your fitness goals</p>
            </div>
          </div>
        </div>

        {/* Trainers Grid */}
        {trainers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No trainers available</h3>
            <p className="text-sm text-slate-500">
              Trainer profiles will appear here once they are set up.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainers.map((trainer) => (
              <Link
                key={trainer.id}
                href={`/portal/trainers/${trainer.id}`}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {trainer.avatarUrl ? (
                        <img
                          src={trainer.avatarUrl}
                          alt={`${trainer.firstName} ${trainer.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-semibold text-slate-600">
                          {trainer.firstName[0]}{trainer.lastName[0]}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {trainer.firstName} {trainer.lastName}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {ROLE_LABELS[trainer.role] || trainer.role}
                      </p>

                      {/* Social Links */}
                      <div className="flex items-center gap-2 mt-2">
                        {trainer.instagramUrl && (
                          <span className="text-slate-400 hover:text-pink-500">
                            <Instagram className="w-4 h-4" />
                          </span>
                        )}
                        {trainer.linkedinUrl && (
                          <span className="text-slate-400 hover:text-blue-500">
                            <Linkedin className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio Preview */}
                  {trainer.bio && (
                    <p className="text-sm text-slate-500 mt-4 line-clamp-2">
                      {trainer.bio}
                    </p>
                  )}

                  {/* Specialties */}
                  {trainer.specialties && trainer.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {trainer.specialties.slice(0, 3).map((specialty) => (
                        <span
                          key={specialty}
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700"
                        >
                          {specialty}
                        </span>
                      ))}
                      {trainer.specialties.length > 3 && (
                        <span className="text-xs text-slate-400">
                          +{trainer.specialties.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Classes */}
                  {trainer.instructorClasses.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>Teaches {trainer.instructorClasses.length} classes</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

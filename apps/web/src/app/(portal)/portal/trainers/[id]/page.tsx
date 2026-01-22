'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Instagram, Linkedin, Award, Dumbbell, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
    description: string | null;
    durationMinutes: number;
  }[];
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner & Trainer',
  ADMIN: 'Admin & Trainer',
  MANAGER: 'Manager & Trainer',
  INSTRUCTOR: 'Personal Trainer',
};

export default function TrainerDetailPage() {
  const params = useParams();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTrainer(params.id as string);
    }
  }, [params.id]);

  const fetchTrainer = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/staff/${id}`);
      const data = await response.json();

      if (data.success) {
        setTrainer(data.data);
      } else {
        setError(data.error?.message || 'Failed to load trainer');
      }
    } catch {
      setError('Failed to load trainer');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/portal/trainers"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trainers
          </Link>
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
            {error || 'Trainer not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/portal/trainers"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trainers
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-32" />
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {trainer.avatarUrl ? (
                  <img
                    src={trainer.avatarUrl}
                    alt={`${trainer.firstName} ${trainer.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-slate-600">
                    {trainer.firstName[0]}{trainer.lastName[0]}
                  </span>
                )}
              </div>

              {/* Name and Role */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">
                  {trainer.firstName} {trainer.lastName}
                </h1>
                <p className="text-slate-500">{ROLE_LABELS[trainer.role] || trainer.role}</p>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2">
                {trainer.instagramUrl && (
                  <a
                    href={trainer.instagramUrl.startsWith('http') ? trainer.instagramUrl : `https://instagram.com/${trainer.instagramUrl.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-pink-100 hover:text-pink-600 transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {trainer.linkedinUrl && (
                  <a
                    href={trainer.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {trainer.bio && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-3">About</h2>
            <p className="text-slate-600 whitespace-pre-wrap">{trainer.bio}</p>
          </div>
        )}

        {/* Specialties */}
        {trainer.specialties && trainer.specialties.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-indigo-500" />
              Specialties
            </h2>
            <div className="flex flex-wrap gap-2">
              {trainer.specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {trainer.certifications && trainer.certifications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              Certifications
            </h2>
            <div className="space-y-2">
              {trainer.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Award className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-slate-700">{cert}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classes */}
        {trainer.instructorClasses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-purple-500" />
              Classes I Teach
            </h2>
            <div className="space-y-3">
              {trainer.instructorClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">{cls.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      {cls.durationMinutes} min
                    </div>
                  </div>
                  {cls.description && (
                    <p className="text-sm text-slate-500 mt-1">{cls.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Button */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Work with {trainer.firstName}</h2>
          <p className="text-sm text-slate-500 mb-4">
            Interested in personal training or have questions? Book a session or reach out to discuss your fitness goals.
          </p>
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
            Book a Session
          </Button>
        </div>
      </div>
    </div>
  );
}

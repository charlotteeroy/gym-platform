'use client';

import { useState } from 'react';
import { User, Mail, Phone, Calendar, Edit, CheckCircle } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface MemberProfileHeaderProps {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    dateOfBirth?: Date | null;
    status: string;
    joinedAt: Date;
  };
  tags: Tag[];
  onCheckIn?: () => void;
  onEdit?: () => void;
}

export function MemberProfileHeader({
  member,
  tags,
  onCheckIn,
  onEdit,
}: MemberProfileHeaderProps) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xl">
            {initials}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {member.firstName} {member.lastName}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(member.status)}`}
              >
                {member.status}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span>{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{member.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  Joined {new Date(member.joinedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          {onCheckIn && (
            <button
              onClick={onCheckIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700"
            >
              <CheckCircle className="w-4 h-4" />
              Check In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

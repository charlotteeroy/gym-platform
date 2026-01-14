'use client';

import { useState } from 'react';
import { Plus, X, Tag as TagIcon } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface MemberTagsManagerProps {
  memberId: string;
  memberTags: Tag[];
  availableTags: Tag[];
  onAddTag: (tagId: string) => Promise<void>;
  onRemoveTag: (tagId: string) => Promise<void>;
}

export function MemberTagsManager({
  memberId,
  memberTags,
  availableTags,
  onAddTag,
  onRemoveTag,
}: MemberTagsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const unassignedTags = availableTags.filter(
    (tag) => !memberTags.some((mt) => mt.id === tag.id)
  );

  const handleAddTag = async (tagId: string) => {
    setLoading(tagId);
    try {
      await onAddTag(tagId);
      setIsAdding(false);
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setLoading(tagId);
    try {
      await onRemoveTag(tagId);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <TagIcon className="w-4 h-4" />
          Tags
        </h3>
        {unassignedTags.length > 0 && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Tag
          </button>
        )}
      </div>

      {/* Current Tags */}
      <div className="flex flex-wrap gap-2">
        {memberTags.length === 0 ? (
          <p className="text-sm text-slate-500">No tags assigned</p>
        ) : (
          memberTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                disabled={loading === tag.id}
                className="hover:bg-white/20 rounded-full p-0.5 disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add Tag Dropdown */}
      {isAdding && unassignedTags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2">Select a tag to add:</p>
          <div className="flex flex-wrap gap-2">
            {unassignedTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleAddTag(tag.id)}
                disabled={loading === tag.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium border-2 border-dashed hover:border-solid transition-colors disabled:opacity-50"
                style={{
                  borderColor: tag.color,
                  color: tag.color,
                }}
              >
                <Plus className="w-3 h-3" />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

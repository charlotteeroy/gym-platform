import { prisma, type Tag, type MemberTag } from '@gym/database';
import {
  type CreateTagInput,
  type UpdateTagInput,
  ERROR_CODES,
  type ApiError,
} from '@gym/shared';

export type TagResult =
  | { success: true; tag: Tag }
  | { success: false; error: ApiError };

export type MemberTagResult =
  | { success: true; memberTag: MemberTag }
  | { success: false; error: ApiError };

/**
 * Create a new tag
 */
export async function createTag(gymId: string, input: CreateTagInput): Promise<TagResult> {
  // Check if tag with same name exists
  const existingTag = await prisma.tag.findUnique({
    where: {
      gymId_name: {
        gymId,
        name: input.name,
      },
    },
  });

  if (existingTag) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'A tag with this name already exists',
      },
    };
  }

  const tag = await prisma.tag.create({
    data: {
      name: input.name,
      color: input.color,
      description: input.description,
      gymId,
    },
  });

  return { success: true, tag };
}

/**
 * Update a tag
 */
export async function updateTag(tagId: string, input: UpdateTagInput): Promise<TagResult> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  });

  if (!tag) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Tag not found',
      },
    };
  }

  // If name is being changed, check it's not already in use
  if (input.name && input.name !== tag.name) {
    const existingTag = await prisma.tag.findUnique({
      where: {
        gymId_name: {
          gymId: tag.gymId,
          name: input.name,
        },
      },
    });

    if (existingTag) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.ALREADY_EXISTS,
          message: 'A tag with this name already exists',
        },
      };
    }
  }

  const updatedTag = await prisma.tag.update({
    where: { id: tagId },
    data: input,
  });

  return { success: true, tag: updatedTag };
}

/**
 * Delete a tag
 */
export async function deleteTag(tagId: string): Promise<{ success: boolean; error?: ApiError }> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  });

  if (!tag) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Tag not found',
      },
    };
  }

  // Don't allow deleting system tags
  if (tag.isSystem) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: 'System tags cannot be deleted',
      },
    };
  }

  await prisma.tag.delete({
    where: { id: tagId },
  });

  return { success: true };
}

/**
 * Get tag by ID
 */
export async function getTagById(tagId: string): Promise<Tag | null> {
  return prisma.tag.findUnique({
    where: { id: tagId },
  });
}

/**
 * List all tags for a gym
 */
export async function listTags(gymId: string): Promise<Tag[]> {
  return prisma.tag.findMany({
    where: { gymId },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
}

/**
 * Add a tag to a member
 */
export async function addTagToMember(
  memberId: string,
  tagId: string,
  appliedBy?: string
): Promise<MemberTagResult> {
  // Check if member exists
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Member not found',
      },
    };
  }

  // Check if tag exists and belongs to same gym
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  });

  if (!tag || tag.gymId !== member.gymId) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Tag not found',
      },
    };
  }

  // Check if member already has this tag
  const existingMemberTag = await prisma.memberTag.findUnique({
    where: {
      memberId_tagId: {
        memberId,
        tagId,
      },
    },
  });

  if (existingMemberTag) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'Member already has this tag',
      },
    };
  }

  const memberTag = await prisma.memberTag.create({
    data: {
      memberId,
      tagId,
      appliedBy,
    },
  });

  return { success: true, memberTag };
}

/**
 * Remove a tag from a member
 */
export async function removeTagFromMember(
  memberId: string,
  tagId: string
): Promise<{ success: boolean; error?: ApiError }> {
  const memberTag = await prisma.memberTag.findUnique({
    where: {
      memberId_tagId: {
        memberId,
        tagId,
      },
    },
  });

  if (!memberTag) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Tag not assigned to this member',
      },
    };
  }

  await prisma.memberTag.delete({
    where: { id: memberTag.id },
  });

  return { success: true };
}

/**
 * Get all tags for a member
 */
export async function getMemberTags(memberId: string): Promise<Tag[]> {
  const memberTags = await prisma.memberTag.findMany({
    where: { memberId },
    include: { tag: true },
  });

  return memberTags.map((mt) => mt.tag);
}

/**
 * Get members with a specific tag
 */
export async function getMembersByTag(tagId: string): Promise<{ memberId: string }[]> {
  const memberTags = await prisma.memberTag.findMany({
    where: { tagId },
    select: { memberId: true },
  });

  return memberTags;
}

/**
 * Create default system tags for a gym
 */
export async function createDefaultTags(gymId: string): Promise<Tag[]> {
  const defaultTags = [
    { name: 'VIP', color: '#eab308', description: 'High-value members', isSystem: true },
    { name: 'At-Risk', color: '#ef4444', description: 'Members who may churn', isSystem: true },
    { name: 'New Member', color: '#22c55e', description: 'Recently joined', isSystem: true },
    { name: 'Frequent', color: '#3b82f6', description: 'Regular visitors', isSystem: true },
  ];

  const tags: Tag[] = [];

  for (const tagData of defaultTags) {
    const existingTag = await prisma.tag.findUnique({
      where: {
        gymId_name: {
          gymId,
          name: tagData.name,
        },
      },
    });

    if (!existingTag) {
      const tag = await prisma.tag.create({
        data: {
          ...tagData,
          gymId,
        },
      });
      tags.push(tag);
    }
  }

  return tags;
}

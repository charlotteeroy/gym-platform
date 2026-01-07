'use client';

import { useState } from 'react';
import { Plus, Search, MoreHorizontal, UserPlus } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddMemberDialog } from '@/components/forms/add-member-dialog';

// Placeholder data - will be replaced with real data from API
const members: Array<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  joinedAt: string;
}> = [];

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const filteredMembers = members.filter(
    (member) =>
      member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Header title="Members" description="Manage your gym members" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setIsAddMemberOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        {/* Members Table/Grid */}
        {members.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <UserPlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No members yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by adding your first member to the gym.
              </p>
              <Button onClick={() => setIsAddMemberOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Members ({filteredMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/50">
                        <td className="py-3">
                          <div className="font-medium">
                            {member.firstName} {member.lastName}
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground">{member.email}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              member.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : member.status === 'PAUSED'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{member.joinedAt}</td>
                        <td className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>Edit Member</DropdownMenuItem>
                              <DropdownMenuItem>Check In</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AddMemberDialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} />
    </>
  );
}

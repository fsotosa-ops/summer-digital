'use client';

import React from 'react';
import {
  ApiUser,
  ApiOrganization,
  ApiMemberRole,
} from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { ROLE_LABELS } from './constants';

interface OrganizationsTabProps {
  user: ApiUser;
  isSuperAdmin: boolean;
  availableOrgs: ApiOrganization[];
  showAddOrg: boolean;
  selectedOrgId: string;
  selectedRole: ApiMemberRole;
  addingOrg: boolean;
  removingOrgId: string | null;
  onShowAddOrg: (show: boolean) => void;
  onSelectedOrgIdChange: (id: string) => void;
  onSelectedRoleChange: (role: ApiMemberRole) => void;
  onAddToOrg: () => void;
  onRemoveFromOrg: (orgId: string, membershipId: string) => void;
  onLoadAvailableOrgs: () => void;
}

export function OrganizationsTab({
  user,
  isSuperAdmin,
  availableOrgs,
  showAddOrg,
  selectedOrgId,
  selectedRole,
  addingOrg,
  removingOrgId,
  onShowAddOrg,
  onSelectedOrgIdChange,
  onSelectedRoleChange,
  onAddToOrg,
  onRemoveFromOrg,
  onLoadAvailableOrgs,
}: OrganizationsTabProps) {
  const orgsNotJoined = availableOrgs.filter(
    (org) => !user.organizations.some((m) => m.organization_id === org.id),
  );

  return (
    <div className="max-w-2xl space-y-3">
      {user.organizations.length === 0 && !showAddOrg ? (
        <p className="text-sm text-slate-400 italic text-center py-6">
          Sin organizaciones
        </p>
      ) : (
        user.organizations.map((org) => (
          <div
            key={org.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">
                {org.organization_name || org.organization_slug}
              </p>
              <p className="text-xs text-slate-500">{org.organization_slug}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                {ROLE_LABELS[org.role] || org.role}
              </Badge>
              <Badge
                variant="outline"
                className={
                  org.status === 'active'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-50 text-slate-500'
                }
              >
                {org.status === 'active' ? 'Activo' : org.status}
              </Badge>
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={removingOrgId === org.id}
                  onClick={() => onRemoveFromOrg(org.organization_id, org.id)}
                >
                  {removingOrgId === org.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserMinus className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))
      )}

      {/* Add to org form */}
      {showAddOrg ? (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Organización</Label>
            <Select value={selectedOrgId} onValueChange={onSelectedOrgIdChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecciona organización" />
              </SelectTrigger>
              <SelectContent>
                {orgsNotJoined.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    Ya está en todas las organizaciones
                  </SelectItem>
                ) : (
                  orgsNotJoined.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Rol</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => onSelectedRoleChange(v as ApiMemberRole)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="participante">Participante</SelectItem>
                <SelectItem value="facilitador">Facilitador</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onAddToOrg}
              disabled={addingOrg || !selectedOrgId}
              className="bg-teal-600 hover:bg-teal-700 h-8"
            >
              {addingOrg && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Agregar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowAddOrg(false)}
              className="h-8"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        isSuperAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onLoadAvailableOrgs();
              onShowAddOrg(true);
            }}
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar a organización
          </Button>
        )
      )}
    </div>
  );
}

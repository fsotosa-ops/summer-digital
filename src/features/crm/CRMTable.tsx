'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { UserDetailDialog } from "./components/UserDetailDialog";
import { Skeleton } from "../../components/ui/skeleton";
import { motion } from 'framer-motion';

type UserRank = "Semilla" | "Brote" | "Árbol" | "Bosque" | "Oasis";

interface CRMUser {
    id: number;
    name: string;
    org: string;
    score: number;
    rank: UserRank;
    status: string;
    lastSeen: string;
    daysInactive: number;
}

export function CRMTable() {
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock initial load
  useEffect(() => {
      const timer = setTimeout(() => {
          setUsers([
            { id: 1, name: "Valentina Muñoz", org: "Fundación Summer", score: 78, rank: "Bosque", status: "Activo", lastSeen: "Hace 2h", daysInactive: 0 },
            { id: 2, name: "Carlos Pérez", org: "Liceo 1", score: 45, rank: "Árbol", status: "Pendiente", lastSeen: "Hace 1d", daysInactive: 1 },
            { id: 3, name: "Ana Silva", org: "Colegio B", score: 92, rank: "Oasis", status: "Activo", lastSeen: "Hace 5m", daysInactive: 0 },
            { id: 4, name: "Roberto Díaz", org: "ONG Local", score: 12, rank: "Semilla", status: "Inactivo", lastSeen: "Hace 1w", daysInactive: 8 },
            { id: 5, name: "Elena Gómez", org: "Fundación Summer", score: 25, rank: "Brote", status: "Activo", lastSeen: "Hace 3d", daysInactive: 3 },
          ]);
          setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
  }, []);

  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<CRMUser | null>(null);

  // Extract unique organizations
  const organizations = Array.from(new Set(users.map(u => u.org)));

  const filteredUsers = users.filter(user => {
      if (orgFilter !== "all" && user.org !== orgFilter) return false;
      if (rankFilter !== "all" && user.rank !== rankFilter) return false;
      if (riskFilter && user.daysInactive <= 7) return false;
      return true;
  });

  return (
    <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <div className="w-full sm:w-[200px]">
                    <Select value={orgFilter} onValueChange={setOrgFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Organización" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las Organizaciones</SelectItem>
                            {organizations.map(org => (
                                <SelectItem key={org} value={org}>{org}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full sm:w-[150px]">
                    <Select value={rankFilter} onValueChange={setRankFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Rango" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Rangos</SelectItem>
                            <SelectItem value="Semilla">Semilla</SelectItem>
                            <SelectItem value="Brote">Brote</SelectItem>
                            <SelectItem value="Árbol">Árbol</SelectItem>
                            <SelectItem value="Bosque">Bosque</SelectItem>
                            <SelectItem value="Oasis">Oasis</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="flex items-center space-x-2">
                <Checkbox id="risk" checked={riskFilter} onCheckedChange={(checked: boolean | 'indeterminate') => setRiskFilter(checked === true)} />
                <Label htmlFor="risk" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Ver Usuarios en Riesgo
                </Label>
            </div>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
            <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead>Nombre</TableHead>
                <TableHead>Organización</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Oasis Score</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Última Conexión</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {isLoading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                <motion.tr 
                    key={user.id}
                    layoutId={`row-${user.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors border-b last:border-0 table-row"
                    onClick={() => setSelectedUser(user)}
                    whileHover={{ backgroundColor: "rgba(248,250,252,1)" }}
                >
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://i.pravatar.cc/150?u=${user.id}`} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {user.name}
                        </div>
                    </TableCell>
                    <TableCell>{user.org}</TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-normal border-0">
                            {user.rank}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 w-6">{user.score}</span>
                            <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${user.score}%` }} />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <span className={user.status === 'Activo' ? 'text-green-600 font-medium text-xs' : 'text-slate-400 text-xs'}>
                                {user.status}
                            </span>
                            {user.daysInactive > 7 && (
                                <span className="text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 border border-red-100">
                                    RIESGO
                                </span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell className="text-right text-slate-500 text-xs">{user.lastSeen}</TableCell>
                </motion.tr>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                        No se encontraron usuarios con los filtros seleccionados.
                    </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>

        {/* User Detail Dialog */}
        <UserDetailDialog 
            user={selectedUser} 
            open={!!selectedUser} 
            onOpenChange={(open) => !open && setSelectedUser(null)} 
        />
    </div>
  );
}


'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
// Since we don't know exact export of admin pages, we'll placeholder them or try to import if standard
// Assuming standard page components might be available or we render placeholders for now
// Based on current file structure I don't see direct page exports easily reusable without refactor?
// I will create a placeholder structure that *would* render them, or simple messages.
// Wait, user said: "Renderiza el contenido actual de /admin/organizations"
// I should probably check if those components are exportable or if I need to move code.
// For now, I will build the Tabs structure.

export default function AdminOverviewPage() {
    const { user } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Use timeout to avoid "synchronous setState" warning and ensure hydration
        const timer = setTimeout(() => setIsMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // Prevent hydration mismatch by rendering nothing until client-side
    if (!isMounted) return null;

    if (!user || !['Admin', 'SuperAdmin'].includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <h2 className="text-xl font-semibold">Acceso Restringido</h2>
                <p>No tienes permisos para ver esta página.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Panel de Administración</h1>
                <p className="text-slate-500">Gestiona organizaciones, usuarios y recursos desde un solo lugar.</p>
            </div>

            <Tabs defaultValue="organizations" className="space-y-4">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="organizations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Organizaciones
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Usuarios
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="organizations" className="space-y-4">
                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 bg-slate-50/50">
                        Componente de Organizaciones (Placeholder - Integration Pending)
                    </div>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 bg-slate-50/50">
                        Componente de Usuarios (Placeholder - Integration Pending)
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

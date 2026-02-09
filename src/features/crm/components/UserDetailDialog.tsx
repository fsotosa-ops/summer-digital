import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Phone, Shield, Edit2, Target, Clock } from "lucide-react";

// Reuse the type from CRMTable or import from a shared types file if available
interface CRMUser {
    id: number;
    name: string;
    org: string;
    score: number;
    rank: string;
    status: string;
    lastSeen: string;
    daysInactive: number;
}

interface UserDetailDialogProps {
  user: CRMUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDialog({ user, open, onOpenChange }: UserDetailDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border-0 shadow-2xl">
        
        {/* Header Background */}
        <div className="h-32 bg-slate-100 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5" />
        </div>

        <div className="px-6 pb-6 -mt-12 relative">
             <div className="flex justify-between items-end mb-4">
                 <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative"
                 >
                    <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                        <AvatarImage src={`https://i.pravatar.cc/150?u=${user.id}`} />
                        <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Badge variant={user.status === 'Activo' ? 'default' : 'secondary'} className={`absolute -bottom-2 -right-2 px-2 py-0.5 border-2 border-white ${user.status === 'Activo' ? 'bg-green-500' : 'bg-slate-400'}`}>
                        {user.status}
                    </Badge>
                 </motion.div>
                 <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                 >
                     <Button variant="outline" size="sm" className="gap-2">
                         <Edit2 size={14} /> Editar
                     </Button>
                 </motion.div>
             </div>

             <DialogHeader className="mb-6">
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <DialogTitle className="text-2xl font-bold text-slate-900">{user.name}</DialogTitle>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <Building2 size={16} /> {user.org}
                    </p>
                </motion.div>
             </DialogHeader>

             <motion.div 
                className="grid gap-6"
                initial="hidden"
                animate="visible"
                variants={{
                    visible: { transition: { staggerChildren: 0.1 } }
                }}
             >
                {/* Metrics Card */}
                <motion.section 
                    variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-100"
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Target size={14} /> Progreso Oasis
                            </h4>
                            <div className="flex items-end gap-1">
                                <span className="text-xl font-bold text-slate-900">{user.score}</span>
                                <span className="text-xs text-slate-400 mb-1">pts</span>
                            </div>
                        </div>
                        
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(user.score / 1000) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-brand rounded-full bg-gradient-to-r from-brand to-purple-600" 
                            />
                        </div>
                    </div>
                </motion.section>

                {/* Contact Info */}
                <motion.section 
                    variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                    className="grid grid-cols-2 gap-4"
                >
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Mail size={16} className="text-slate-400" />
                            <span>usuario@{user.org.toLowerCase().replace(/\s+/g, '')}.cl</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Phone size={16} className="text-slate-400" />
                            <span>+56 9 1234 5678</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                         <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Shield size={16} className="text-slate-400" />
                            <span>Participante</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Clock size={16} className="text-slate-400" />
                            <span>Visto {user.lastSeen}</span>
                        </div>
                    </div>
                </motion.section>

             </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper icon component since Building2 might not be available in file scope if not imported
function Building2({ size, className }: { size?: number, className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size || 24} 
            height={size || 24} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
            <path d="M10 6h4"/>
            <path d="M10 10h4"/>
            <path d="M10 14h4"/>
            <path d="M10 18h4"/>
        </svg>
    )
}

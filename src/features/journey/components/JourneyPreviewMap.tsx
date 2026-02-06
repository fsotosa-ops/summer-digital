'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Journey, JourneyNode, NodeStatus } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lock, Play, Star, Users as UsersIcon, ChevronLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  let match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  return null;
}

interface JourneyPreviewMapProps {
  initialJourney: Journey;
  onBack: () => void;
}

export function JourneyPreviewMap({ initialJourney, onBack }: JourneyPreviewMapProps) {
  const [journey, setJourney] = useState<Journey>(initialJourney);
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);

  const simulateComplete = useCallback((nodeId: string) => {
    setJourney(prev => {
      const nodeIndex = prev.nodes.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) return prev;

      const updatedNodes = prev.nodes.map((node, idx) => {
        if (node.id === nodeId) {
          return { ...node, status: 'completed' as NodeStatus };
        }
        // Unlock the next node if it's currently locked
        if (idx === nodeIndex + 1 && node.status === 'locked') {
          return { ...node, status: 'available' as NodeStatus };
        }
        return node;
      });

      const completedCount = updatedNodes.filter(n => n.status === 'completed').length;
      const progress = Math.round((completedCount / updatedNodes.length) * 100);

      return { ...prev, nodes: updatedNodes, progress };
    });
    setSelectedNode(null);
  }, []);

  const resetSimulation = useCallback(() => {
    setJourney(initialJourney);
    setSelectedNode(null);
  }, [initialJourney]);

  const getNodeById = (id: string) => journey.nodes.find(n => n.id === id);

  const completedCount = journey.nodes.filter(n => n.status === 'completed').length;
  const totalCount = journey.nodes.length;

  return (
    <div className="space-y-4">
      {/* Preview Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-sm font-medium text-purple-800">
            Modo Vista Previa — Los cambios no se guardan
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetSimulation} className="text-purple-700 border-purple-300 hover:bg-purple-100">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reiniciar
          </Button>
          <Button variant="outline" size="sm" onClick={onBack} className="text-slate-700">
            <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
            Volver al Editor
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-900">{journey.title}</h2>
          <span className="text-sm text-slate-500">
            {completedCount}/{totalCount} completados — {journey.progress}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${journey.progress}%` }}
          />
        </div>
      </div>

      {/* Journey Map */}
      <div className="relative w-full h-[600px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 opacity-5"
             style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        </div>

        {/* Success message at 100% */}
        {journey.progress === 100 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-teal-50 border border-teal-200 rounded-lg px-6 py-3 shadow-lg">
            <p className="text-teal-800 font-semibold text-center">
              Journey completado al 100%
            </p>
          </div>
        )}

        {/* SVG Layer for Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {journey.nodes.map(node => (
            <React.Fragment key={node.id}>
              {node.connections.map(targetId => {
                const target = getNodeById(targetId);
                if (!target) return null;

                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={`${node.x}%`} y1={`${node.y}%`}
                    x2={`${target.x}%`} y2={`${target.y}%`}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </React.Fragment>
          ))}
        </svg>

        {/* Nodes Layer */}
        {journey.nodes.map((node) => (
          <motion.div
            key={node.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: node.status === 'locked' ? 0.5 : 1,
              filter: node.status === 'locked' ? 'grayscale(100%)' : 'grayscale(0%)'
            }}
            transition={{
              duration: 0.5,
              type: 'spring',
              filter: { duration: 1 }
            }}
          >
            <NodeButton node={node} onClick={() => node.status !== 'locked' && setSelectedNode(node)} />
            {/* Label */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none">
              <span className={cn(
                "text-xs font-semibold px-2 py-1 rounded bg-white/80 backdrop-blur-sm shadow-sm transition-colors duration-500",
                node.status === 'locked' ? 'text-slate-400' : 'text-slate-700'
              )}>
                {node.title}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Detail Dialog */}
        <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
          <DialogContent className={cn("sm:max-w-md", (selectedNode?.type === 'typeform' || selectedNode?.type === 'video') && "sm:max-w-2xl")}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-teal-800">
                {selectedNode?.title}
              </DialogTitle>
              <DialogDescription className="text-base text-slate-600 pt-2">
                {selectedNode?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              {selectedNode?.type === 'typeform' && selectedNode.externalUrl ? (
                <div className="w-full h-[400px] rounded-lg overflow-hidden border border-slate-200">
                  <iframe
                    src={selectedNode.externalUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    title="Typeform"
                  ></iframe>
                </div>
              ) : selectedNode?.type === 'video' && selectedNode.videoUrl ? (
                <div className="w-full rounded-lg overflow-hidden border border-slate-200">
                  {getVideoEmbedUrl(selectedNode.videoUrl) ? (
                    <iframe
                      src={getVideoEmbedUrl(selectedNode.videoUrl)!}
                      className="w-full aspect-video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="bg-slate-900 flex items-center justify-center aspect-video">
                      <Play className="h-12 w-12 text-white opacity-50" />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-center h-32 border border-slate-100 border-dashed">
                    {selectedNode?.type === 'video' && <Play className="h-10 w-10 text-teal-400 opacity-50" />}
                    {selectedNode?.type === 'quiz' && <span className="text-4xl">?</span>}
                    {selectedNode?.type === 'workshop' && <UsersIcon className="h-10 w-10 text-amber-400 opacity-50" />}
                    {selectedNode?.type === 'challenge' && <Star className="h-10 w-10 text-yellow-500 opacity-50" />}
                    {selectedNode?.type === 'typeform' && <Play className="h-10 w-10 text-teal-400 opacity-50" />}
                    {selectedNode?.type === 'article' && <Play className="h-10 w-10 text-teal-400 opacity-50" />}
                    {selectedNode?.type === 'feedback' && <UsersIcon className="h-10 w-10 text-amber-400 opacity-50" />}
                  </div>
                  <p className="text-sm text-slate-500 mt-4 text-center italic">
                    {selectedNode?.status === 'completed'
                      ? "Ya completaste esta actividad."
                      : "Esta actividad está lista para comenzar."}
                  </p>
                </>
              )}
            </div>

            <DialogFooter className="sm:justify-center">
              {selectedNode?.status === 'available' ? (
                <Button
                  onClick={() => selectedNode && simulateComplete(selectedNode.id)}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Simular Completar
                </Button>
              ) : selectedNode?.status === 'completed' ? (
                <Button variant="outline" className="w-full sm:w-auto border-teal-200 text-teal-700 bg-teal-50">
                  <Check className="mr-2 h-4 w-4" /> Completado
                </Button>
              ) : (
                <Button disabled variant="secondary" className="w-full sm:w-auto bg-slate-100 text-slate-400">
                  <Lock className="mr-2 h-4 w-4" /> Bloqueado
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function NodeButton({ node, onClick }: { node: JourneyNode; onClick: () => void }) {
  const statusColors = {
    completed: "bg-teal-500 text-white shadow-teal-200",
    "in-progress": "bg-amber-400 text-amber-900 shadow-amber-200 animate-pulse-slow",
    available: "bg-white text-teal-600 border-2 border-teal-500",
    locked: "bg-slate-200 text-slate-400",
  };

  const Icon = node.status === 'completed' ? Check : node.status === 'locked' ? Lock : node.type === 'challenge' ? Star : Play;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors z-20",
        statusColors[node.status] || statusColors.locked
      )}
    >
      <Icon size={20} fill={node.status === 'completed' ? 'none' : 'currentColor'} className={node.status === 'completed' ? '' : 'opacity-80'} />
    </motion.button>
  );
}

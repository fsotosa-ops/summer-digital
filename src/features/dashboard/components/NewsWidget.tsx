import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { useContentStore } from '@/store/useContentStore';

export function NewsWidget() {
  const { announcements } = useContentStore();

  return (
    <div className="bg-white rounded-3xl shadow-xl border-none overflow-hidden">
      {/* Sticky header with subtle pastel gradient */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-sky-50 via-purple-50 to-amber-50 px-6 py-4 border-b border-slate-100/60">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-800">Anuncios y Novedades</h3>
          <Badge
            variant="secondary"
            className="bg-white/70 text-slate-500 hover:bg-white border-none font-normal text-xs"
          >
            {announcements.length} Recientes
          </Badge>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <div className="px-6 py-4 space-y-4">
          {announcements.length > 0 ? (
            announcements.map((item) => (
              <div key={item.id} className="group pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                  <Badge
                    variant={item.type === 'alert' ? 'destructive' : 'outline'}
                    className="text-[10px] px-2 py-0 h-5"
                  >
                    {item.type === 'alert' ? 'ALERTA' : item.type === 'event' ? 'EVENTO' : 'INFO'}
                  </Badge>
                  <div className="flex items-center text-slate-400 text-xs text-right">
                    <Calendar size={12} className="mr-1" />
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{item.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No hay anuncios recientes.</div>
          )}
        </div>
      </div>
    </div>
  );
}

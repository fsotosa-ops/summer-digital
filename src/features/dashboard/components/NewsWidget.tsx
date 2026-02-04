import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { useContentStore } from '@/store/useContentStore';

export function NewsWidget() {
  const { announcements } = useContentStore();

  return (
    <Card className="border-slate-100 shadow-sm h-full max-h-[500px] overflow-y-auto">
      <CardHeader className="pb-3 sticky top-0 bg-white z-10 border-b border-slate-50">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          Anuncios y Novedades
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none font-normal text-xs">
            {announcements.length} Recientes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {announcements.length > 0 ? announcements.map((item) => (
          <div key={item.id} className="group pb-4 border-b border-slate-50 last:border-0 last:pb-0">
            <div className="flex justify-between items-start mb-1">
              <Badge variant={item.type === 'alert' ? 'destructive' : 'outline'} className="text-[10px] px-2 py-0 h-5">
                {item.type === 'alert' ? 'ALERTA' : item.type === 'event' ? 'EVENTO' : 'INFO'}
              </Badge>
              <div className="flex items-center text-slate-400 text-xs text-right">
                <Calendar size={12} className="mr-1" />
                {new Date(item.date).toLocaleDateString()}
              </div>
            </div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              {item.title}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                {item.content}
            </p>
          </div>
        )) : (
            <div className="text-center py-8 text-slate-400 text-sm">
                No hay anuncios recientes.
            </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  category: string;
}

const MOCK_NEWS: NewsItem[] = [
  { id: '1', title: 'Nueva Alianza con Escuelas del Sur', date: '02 Feb 2026', category: 'General' },
  { id: '2', title: 'Resultados del Workshop de Enero', date: '28 Ene 2026', category: 'Actividades' },
  { id: '3', title: 'Tips para mejorar tu Oasis Score', date: '20 Ene 2026', category: 'Tips' },
];

export function NewsWidget() {
  return (
    <Card className="border-slate-100 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          Novedades
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none font-normal text-xs">
            Fundación Summer
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {MOCK_NEWS.map((item) => (
          <div key={item.id} className="group cursor-pointer">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                {item.category}
              </span>
              <div className="flex items-center text-slate-400 text-xs">
                <Calendar size={12} className="mr-1" />
                {item.date}
              </div>
            </div>
            <h4 className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
              {item.title}
            </h4>
            <div className="h-px bg-slate-50 mt-3 group-last:hidden" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

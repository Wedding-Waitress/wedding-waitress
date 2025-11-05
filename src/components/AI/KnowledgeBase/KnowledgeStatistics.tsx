import { Card, CardContent } from '@/components/ui/card';
import { KnowledgeBaseEntry } from '@/hooks/useKnowledgeBase';
import { formatDistanceToNow } from 'date-fns';

interface KnowledgeStatisticsProps {
  knowledgeBase: KnowledgeBaseEntry[];
}

export const KnowledgeStatistics = ({ knowledgeBase }: KnowledgeStatisticsProps) => {
  const totalEntries = knowledgeBase.filter(kb => kb.is_active).length;
  const categoriesUsed = new Set(knowledgeBase.map(kb => kb.category)).size;
  const faqCount = knowledgeBase.filter(kb => kb.category === 'faq' && kb.is_active).length;
  const lastUpdated = knowledgeBase.length > 0
    ? knowledgeBase.reduce((latest, kb) => 
        new Date(kb.updated_at) > new Date(latest) ? kb.updated_at : latest, 
        knowledgeBase[0].updated_at
      )
    : null;

  return (
    <Card className="bg-gradient-to-r from-primary to-purple-600 text-white border-0">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold">{totalEntries}</p>
            <p className="text-sm text-purple-100">Active Entries</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{categoriesUsed}</p>
            <p className="text-sm text-purple-100">Categories</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{faqCount}</p>
            <p className="text-sm text-purple-100">FAQs</p>
          </div>
          <div>
            <p className="text-3xl font-bold">
              {lastUpdated ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true }) : 'Never'}
            </p>
            <p className="text-sm text-purple-100">Last Updated</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

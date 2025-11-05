import { useState } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { KnowledgeBaseEntry } from '@/hooks/useKnowledgeBase';
import { FAQ_TEMPLATES } from '@/lib/knowledgeTemplates';

interface FAQSectionProps {
  faqs: KnowledgeBaseEntry[];
  onSave: (entry: Partial<KnowledgeBaseEntry>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

export const FAQSection = ({ faqs, onSave, onDelete, onToggle }: FAQSectionProps) => {
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFAQ, setEditingFAQ] = useState({ question: '', answer: '' });

  const addFAQ = async () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) return;

    const success = await onSave({
      category: 'faq',
      question: newFAQ.question,
      answer: newFAQ.answer,
      sort_order: faqs.length,
      is_active: true
    });

    if (success) {
      setNewFAQ({ question: '', answer: '' });
    }
  };

  const addTemplate = async (template: typeof FAQ_TEMPLATES[keyof typeof FAQ_TEMPLATES]) => {
    await onSave({
      category: 'faq',
      question: template.question,
      answer: template.answer,
      sort_order: faqs.length,
      is_active: true
    });
  };

  const startEdit = (faq: KnowledgeBaseEntry) => {
    setEditingId(faq.id);
    setEditingFAQ({ question: faq.question || '', answer: faq.answer });
  };

  const saveEdit = async (id: string) => {
    await onSave({
      id,
      question: editingFAQ.question,
      answer: editingFAQ.answer
    });
    setEditingId(null);
  };

  return (
    <AccordionItem value="faq">
      <AccordionTrigger>
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span>Frequently Asked Questions</span>
            <Badge variant="secondary">{faqs.length} entries</Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={() => addTemplate(FAQ_TEMPLATES.parking)}>
              + Parking
            </Button>
            <Button size="sm" variant="outline" onClick={() => addTemplate(FAQ_TEMPLATES.dressCode)}>
              + Dress Code
            </Button>
            <Button size="sm" variant="outline" onClick={() => addTemplate(FAQ_TEMPLATES.gifts)}>
              + Gifts
            </Button>
            <Button size="sm" variant="outline" onClick={() => addTemplate(FAQ_TEMPLATES.plusOnes)}>
              + Plus Ones
            </Button>
            <Button size="sm" variant="outline" onClick={() => addTemplate(FAQ_TEMPLATES.children)}>
              + Children
            </Button>
          </div>

          {faqs.map((faq) => (
            <Card key={faq.id} className={!faq.is_active ? 'opacity-50' : ''}>
              <CardContent className="pt-6">
                {editingId === faq.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Question</Label>
                      <Input
                        value={editingFAQ.question}
                        onChange={(e) => setEditingFAQ({ ...editingFAQ, question: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Answer</Label>
                      <Textarea
                        value={editingFAQ.answer}
                        onChange={(e) => setEditingFAQ({ ...editingFAQ, answer: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(faq.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">Q: {faq.question}</p>
                        <p className="text-sm text-muted-foreground">A: {faq.answer}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onToggle(faq.id, !faq.is_active)}
                        >
                          {faq.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => startEdit(faq)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(faq.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed border-2">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <Label>Question</Label>
                  <Input
                    placeholder="What time should guests arrive?"
                    value={newFAQ.question}
                    onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Answer</Label>
                  <Textarea
                    placeholder="Guests should arrive at 5:30 PM. The ceremony begins promptly at 6:00 PM."
                    value={newFAQ.answer}
                    onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button onClick={addFAQ} className="w-full" disabled={!newFAQ.question || !newFAQ.answer}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, X, BarChart3 } from 'lucide-react';

interface CreatePollDialogProps {
  open: boolean;
  onClose: () => void;
  onCreatePoll: (
    question: string,
    options: string[],
    isAnonymous: boolean,
    multipleChoice: boolean
  ) => Promise<string | null>;
}

export function CreatePollDialog({ open, onClose, onCreatePoll }: CreatePollDialogProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) return;

    setCreating(true);
    try {
      await onCreatePoll(question.trim(), validOptions, isAnonymous, multipleChoice);
      handleClose();
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setQuestion('');
    setOptions(['', '']);
    setIsAnonymous(false);
    setMultipleChoice(false);
    onClose();
  };

  const validOptionsCount = options.filter(o => o.trim()).length;
  const canCreate = question.trim() && validOptionsCount >= 2;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Nieuwe Poll
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="question">Vraag</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Stel een vraag..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Opties ({validOptionsCount}/10)</Label>
            <div className="space-y-2 mt-1">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Optie ${index + 1}`}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddOption}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Optie toevoegen
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="anonymous">Anoniem stemmen</Label>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="multiple">Meerdere keuzes</Label>
            <Switch
              id="multiple"
              checked={multipleChoice}
              onCheckedChange={setMultipleChoice}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || creating}
              className="flex-1"
            >
              {creating ? 'Aanmaken...' : 'Poll maken'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, X } from 'lucide-react';

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePoll: (data: {
    question: string;
    options: string[];
    pollType: 'multiple_choice' | 'yes_no' | 'rating';
  }) => void;
}

export const CreatePollDialog: React.FC<CreatePollDialogProps> = ({
  open,
  onOpenChange,
  onCreatePoll,
}) => {
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState<'multiple_choice' | 'yes_no' | 'rating'>('multiple_choice');
  const [options, setOptions] = useState<string[]>(['', '']);

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

  const handleSubmit = () => {
    if (!question.trim()) return;

    let finalOptions: string[] = [];
    
    if (pollType === 'multiple_choice') {
      finalOptions = options.filter(opt => opt.trim()).map(opt => opt.trim());
      if (finalOptions.length < 2) return;
    } else if (pollType === 'yes_no') {
      finalOptions = ['Yes', 'No'];
    } else if (pollType === 'rating') {
      finalOptions = ['1', '2', '3', '4', '5'];
    }

    onCreatePoll({
      question: question.trim(),
      options: finalOptions,
      pollType,
    });

    // Reset form
    setQuestion('');
    setPollType('multiple_choice');
    setOptions(['', '']);
  };

  const handleCancel = () => {
    setQuestion('');
    setPollType('multiple_choice');
    setOptions(['', '']);
    onOpenChange(false);
  };

  const isValid = question.trim() && (
    pollType !== 'multiple_choice' || 
    options.filter(opt => opt.trim()).length >= 2
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Poll</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[80px]"
              maxLength={500}
            />
          </div>

          {/* Poll Type */}
          <div className="space-y-2">
            <Label>Poll Type</Label>
            <Select value={pollType} onValueChange={(value: any) => setPollType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="yes_no">Yes/No</SelectItem>
                <SelectItem value="rating">Rating (1-5 stars)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options (only for multiple choice) */}
          {pollType === 'multiple_choice' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={options.length >= 10}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      maxLength={200}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {pollType !== 'multiple_choice' && (
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-gray-600 mb-2">Preview:</div>
                <div className="space-y-2">
                  {pollType === 'yes_no' && (
                    <>
                      <div className="p-2 border rounded text-sm">Yes</div>
                      <div className="p-2 border rounded text-sm">No</div>
                    </>
                  )}
                  {pollType === 'rating' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <div key={rating} className="p-2 border rounded text-sm">
                          {rating}⭐
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Create Poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

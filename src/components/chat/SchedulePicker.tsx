import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Clock, X } from 'lucide-react';
import { format, addMinutes, setHours, setMinutes, isAfter } from 'date-fns';
import { nl } from 'date-fns/locale';

interface SchedulePickerProps {
  scheduledAt: Date | null;
  onScheduleChange: (date: Date | null) => void;
  disabled?: boolean;
}

export function SchedulePicker({ scheduledAt, onScheduleChange, disabled }: SchedulePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(scheduledAt || undefined);
  const [selectedHour, setSelectedHour] = useState(scheduledAt ? scheduledAt.getHours() : new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(scheduledAt ? scheduledAt.getMinutes() : 0);

  const handleConfirm = () => {
    if (!selectedDate) return;
    
    let scheduled = setHours(selectedDate, selectedHour);
    scheduled = setMinutes(scheduled, selectedMinute);
    
    // Make sure it's in the future
    if (isAfter(scheduled, new Date())) {
      onScheduleChange(scheduled);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onScheduleChange(null);
    setSelectedDate(undefined);
    setOpen(false);
  };

  const quickOptions = [
    { label: 'Over 30 min', getValue: () => addMinutes(new Date(), 30) },
    { label: 'Over 1 uur', getValue: () => addMinutes(new Date(), 60) },
    { label: 'Over 2 uur', getValue: () => addMinutes(new Date(), 120) },
    { label: 'Morgen 9:00', getValue: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return setMinutes(setHours(tomorrow, 9), 0);
    }},
  ];

  const handleQuickOption = (date: Date) => {
    onScheduleChange(date);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      {scheduledAt && (
        <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
          <Clock className="h-3 w-3" />
          <span>{format(scheduledAt, 'd MMM HH:mm', { locale: nl })}</span>
          <button 
            onClick={handleClear}
            className="hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-11 w-11 ${scheduledAt ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            disabled={disabled}
          >
            <Clock className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <p className="text-sm font-medium">Bericht inplannen</p>
            
            {/* Quick options */}
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickOption(option.getValue())}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">Of kies een datum en tijd:</p>
              
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                locale={nl}
                className="rounded-md border"
              />
              
              <div className="flex items-center gap-2 mt-3">
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-sm border rounded-md bg-background"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <span>:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-sm border rounded-md bg-background"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              
              <Button 
                onClick={handleConfirm} 
                className="w-full mt-3"
                disabled={!selectedDate}
              >
                Bevestigen
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DATE_FORMAT = "yyyy-MM-dd";

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Drop-in replacement for `<Input type="date" {...field} />` in
// react-hook-form forms: same "yyyy-MM-dd" string in/out (matches every zod
// date schema already in use), so call sites only swap the element — no
// schema or submit-handler changes. Renders as our own Popover + Calendar
// instead of the browser's native, inconsistently-styled date picker.
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, onBlur, name, placeholder = "Pick a date", disabled, className }, ref) => {
    const [open, setOpen] = React.useState(false);
    const parsedDate = value ? parse(value, DATE_FORMAT, new Date()) : undefined;
    const selectedDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined;

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            disabled={disabled}
            name={name}
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !selectedDate && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange?.(date ? format(date, DATE_FORMAT) : "");
              setOpen(false);
            }}
            initialFocus
          />
          {selectedDate && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onChange?.("");
                  setOpen(false);
                }}
              >
                Clear date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  },
);
DatePicker.displayName = "DatePicker";

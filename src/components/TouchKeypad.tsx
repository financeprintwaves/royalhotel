import { Button } from "@/components/ui/button";
import { Delete, X } from "lucide-react";

interface TouchKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  maxLength?: number;
  disabled?: boolean;
}

const TouchKeypad = ({
  value,
  onChange,
  onSubmit,
  maxLength = 5,
  disabled = false,
}: TouchKeypadProps) => {
  const handleKeyPress = (key: string) => {
    if (disabled) return;
    if (value.length < maxLength) {
      const newValue = value + key;
      onChange(newValue);
      // Auto-submit when max length reached
      if (newValue.length === maxLength) {
        setTimeout(() => onSubmit(), 100);
      }
    }
  };

  const handleBackspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled) return;
    onChange("");
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["backspace", "0", "clear"],
  ];

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
      {/* PIN Display */}
      <div className="flex justify-center gap-3 py-6">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              i < value.length
                ? "bg-primary scale-110"
                : "bg-muted border-2 border-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.flat().map((key, index) => {
          if (key === "backspace") {
            return (
              <Button
                key={index}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold touch-manipulation active:scale-95 transition-transform"
                onClick={handleBackspace}
                disabled={disabled || value.length === 0}
                type="button"
              >
                <Delete className="h-6 w-6" />
              </Button>
            );
          }
          if (key === "clear") {
            return (
              <Button
                key={index}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold touch-manipulation active:scale-95 transition-transform"
                onClick={handleClear}
                disabled={disabled || value.length === 0}
                type="button"
              >
                <X className="h-6 w-6" />
              </Button>
            );
          }
          return (
            <Button
              key={index}
              variant="outline"
              size="lg"
              className="h-16 text-2xl font-semibold touch-manipulation active:scale-95 transition-transform hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleKeyPress(key)}
              disabled={disabled}
              type="button"
            >
              {key}
            </Button>
          );
        })}
      </div>

      {/* Submit Button */}
      <Button
        size="lg"
        className="h-14 text-lg font-semibold mt-2 touch-manipulation"
        onClick={onSubmit}
        disabled={disabled || value.length !== maxLength}
        type="button"
      >
        Sign In with PIN
      </Button>
    </div>
  );
};

export default TouchKeypad;

import { Button } from "@/components/ui/button";
import { Delete, X, Check } from "lucide-react";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  title?: string;
  showSubmit?: boolean;
  showCancel?: boolean;
  disabled?: boolean;
  maxLength?: number;
}

const NumericKeypad = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  title = "Enter Amount",
  showSubmit = false,
  showCancel = false,
  disabled = false,
  maxLength = 10,
}: NumericKeypadProps) => {
  const handleKeyPress = (key: string) => {
    if (disabled) return;
    if (value.length < maxLength) {
      onChange(value + key);
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

  const handleDecimal = () => {
    if (disabled || value.includes('.')) return;
    onChange(value + '.');
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "backspace"],
  ];

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto bg-card border rounded-2xl p-6 shadow-lg">
      {title && (
        <div className="text-center">
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
      )}

      {/* Display */}
      <div className="bg-muted rounded-xl p-4 text-center">
        <div className="text-3xl font-mono font-bold text-primary min-h-[48px] flex items-center justify-center">
          {value || "0.000"}
        </div>
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
                className="h-16 text-xl font-semibold rounded-xl touch-manipulation active:scale-95 transition-transform hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleBackspace}
                disabled={disabled || value.length === 0}
                type="button"
              >
                <Delete className="h-6 w-6" />
              </Button>
            );
          }
          if (key === ".") {
            return (
              <Button
                key={index}
                variant="outline"
                size="lg"
                className="h-16 text-2xl font-semibold rounded-xl touch-manipulation active:scale-95 transition-transform"
                onClick={handleDecimal}
                disabled={disabled || value.includes('.')}
                type="button"
              >
                .
              </Button>
            );
          }
          return (
            <Button
              key={index}
              variant="outline"
              size="lg"
              className="h-16 text-2xl font-semibold rounded-xl touch-manipulation active:scale-95 transition-transform hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleKeyPress(key)}
              disabled={disabled}
              type="button"
            >
              {key}
            </Button>
          );
        })}
      </div>

      {/* Action Buttons */}
      {(showSubmit || showCancel) && (
        <div className="flex gap-3 pt-2">
          {showCancel && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-14 rounded-xl"
              onClick={onCancel}
              disabled={disabled}
            >
              <X className="h-5 w-5 mr-2" />
              Cancel
            </Button>
          )}
          {showSubmit && (
            <Button
              size="lg"
              className="flex-1 h-14 rounded-xl"
              onClick={onSubmit}
              disabled={disabled}
            >
              <Check className="h-5 w-5 mr-2" />
              OK
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default NumericKeypad;
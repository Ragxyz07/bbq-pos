import React, { useState, useEffect } from 'react';
import { Lock, X, Delete } from 'lucide-react';
import { sound } from '../utils/sound';

interface PinModalProps {
  isOpen: boolean;
  targetTitle: string; // e.g. "Admin Menu", "Reports"
  correctPin: string;
  onSuccess: () => void;
  onClose: () => void;
  soundEnabled?: boolean;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  targetTitle,
  correctPin,
  onSuccess,
  onClose,
  soundEnabled = true,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    sound.playTap(soundEnabled);
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === correctPin) {
        sound.playCashSuccess(soundEnabled);
        setTimeout(() => {
          onSuccess();
        }, 120);
      } else {
        sound.playCancel(soundEnabled);
        setError(true);
        setTimeout(() => {
          setPin('');
        }, 600);
      }
    }
  };

  const handleDelete = () => {
    sound.playTap(soundEnabled);
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    sound.playTap(soundEnabled);
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm bg-white border-t-2 sm:border-2 border-black p-6 flex flex-col items-center text-black">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 border border-black bg-white flex items-center justify-center text-red-600">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black tracking-wide">Enter Security PIN</h3>
              <p className="text-xs text-black/70">Unlock {targetTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white hover:bg-black hover:text-white border border-black flex items-center justify-center text-black transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Indicators */}
        <div className="my-6 flex items-center gap-4">
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 transition-all duration-200 ${
                  error
                    ? 'bg-red-600 scale-125 border-2 border-red-600 animate-pulse'
                    : filled
                    ? 'bg-red-600 scale-110 border border-red-600'
                    : 'bg-white border-2 border-black'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-bold text-red-600 mb-2 underline tracking-wider">
            Incorrect PIN. Please try again.
          </p>
        )}

        {/* Tactile Keypad */}
        <div className="w-full grid grid-cols-3 gap-2 my-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 sm:h-16 bg-white hover:bg-black hover:text-white active:bg-black active:text-white text-xl font-bold text-black transition-colors border border-black flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 sm:h-16 bg-white hover:bg-black hover:text-white text-xs font-bold uppercase tracking-wider text-black transition-colors border border-black flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 sm:h-16 bg-white hover:bg-black hover:text-white active:bg-black active:text-white text-xl font-bold text-black transition-colors border border-black flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 sm:h-16 bg-white hover:bg-black hover:text-white text-black transition-colors border border-black flex items-center justify-center"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-4 text-[11px] text-black/70 text-center">
          Default security PIN is <strong className="text-black font-bold">1234</strong>
        </p>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Lock, X, Delete, Check } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-black border-t sm:border border-white p-6 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 border border-white bg-black flex items-center justify-center text-white">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Enter Security PIN</h3>
              <p className="text-xs text-white/70">Unlock {targetTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-black hover:bg-white hover:text-black border border-white flex items-center justify-center text-white transition-colors"
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
                    ? 'bg-white scale-125 border-2 border-white animate-pulse'
                    : filled
                    ? 'bg-white scale-110 border border-white'
                    : 'bg-black border border-white'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-bold text-white mb-2 underline tracking-wider">
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
              className="h-14 sm:h-16 bg-black hover:bg-white hover:text-black active:bg-white active:text-black text-xl font-bold text-white transition-colors border border-white flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 sm:h-16 bg-black hover:bg-white hover:text-black text-xs font-bold uppercase tracking-wider text-white transition-colors border border-white flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 sm:h-16 bg-black hover:bg-white hover:text-black active:bg-white active:text-black text-xl font-bold text-white transition-colors border border-white flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 sm:h-16 bg-black hover:bg-white hover:text-black text-white transition-colors border border-white flex items-center justify-center"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-4 text-[11px] text-white/70 text-center">
          Default security PIN is <strong className="text-white">1234</strong>
        </p>
      </div>
    </div>
  );
};

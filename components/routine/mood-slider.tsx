"use client";

interface MoodSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function MoodSlider({ value, onChange }: MoodSliderProps) {
  return (
    <div className="mt-3 flex gap-3.5 items-center">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label="감정 점수"
      />
      <div className="min-w-[54px] text-center border border-[rgba(226,232,240,0.9)] rounded-full py-2 px-2.5 font-[950] text-gs-blue bg-gs-blue-light">
        {value}
      </div>
    </div>
  );
}

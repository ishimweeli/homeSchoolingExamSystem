import React, { useEffect, useMemo, useState } from 'react';

type Pair = { left: string; right: string };
type Content = {
  pairs: Pair[] | Record<string, string>;
  explanation?: string;
};

interface Props {
  content: Content;
  showFeedback: boolean;
  onCheck: (matches: Record<string, string>, isCorrect: boolean) => void;
  revealCorrectOnFail?: boolean;
}

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function MatchingActivity({
  content,
  showFeedback,
  onCheck,
  revealCorrectOnFail = true,
}: Props) {
  // Normalize pairs: convert object to array if needed
  const normalizedPairs: Pair[] = useMemo(() => {
    if (!content || !content.pairs) return [];
    if (Array.isArray(content.pairs)) return content.pairs;
    return Object.entries(content.pairs).map(([left, right]) => ({ left, right }));
  }, [content.pairs]);

  const leftItems = useMemo(() => normalizedPairs.map(p => p.left), [normalizedPairs]);
  const [rightItems, setRightItems] = useState<string[]>(() => shuffle(normalizedPairs.map(p => p.right)));

  const [matches, setMatches] = useState<Record<string, string>>({});
  const [matchColors, setMatchColors] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [checked, setChecked] = useState<{ done: boolean; isCorrect: boolean } | null>(null);

  useEffect(() => {
    setRightItems(shuffle(normalizedPairs.map(p => p.right)));
    setMatches({});
    setMatchColors({});
    setSelectedLeft(null);
    setChecked(null);
  }, [normalizedPairs]);

  const randomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 20);
    const lightness = 60 + Math.floor(Math.random() * 10);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const handleLeftClick = (left: string) => {
    if (showFeedback) return;
    setSelectedLeft(prev => (prev === left ? null : left));
  };

  const handleRightClick = (right: string) => {
    if (showFeedback || !selectedLeft) return;
    const existingLeft = Object.entries(matches).find(([, r]) => r === right)?.[0];
    if (existingLeft) return;

    const color = randomColor();

    setMatches(prev => ({ ...prev, [selectedLeft]: right }));
    setMatchColors(prev => ({ ...prev, [selectedLeft]: color }));
    setSelectedLeft(null);
  };

  const unmatchLeft = (left: string) => {
    if (showFeedback) return;
    setMatches(prev => {
      const next = { ...prev };
      delete next[left];
      return next;
    });
    setMatchColors(prev => {
      const next = { ...prev };
      delete next[left];
      return next;
    });
  };

  const allMatched = leftItems.length > 0 && Object.keys(matches).length === leftItems.length;

  const checkMatches = () => {
    const isCorrect = normalizedPairs.every(pair => matches[pair.left] === pair.right);
    setChecked({ done: true, isCorrect });
    onCheck(matches, isCorrect);
  };

  const isPairCorrect = (left: string) => {
    const match = matches[left];
    const correct = normalizedPairs.find(p => p.left === left)?.right;
    return match && correct === match;
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT */}
        <div>
          <h4 className="text-sm font-semibold text-purple-700 mb-3">Left</h4>
          <div className="space-y-2">
            {leftItems.map((left, i) => {
              const matchedRight = matches[left];
              const selected = selectedLeft === left;
              const correctFlag = checked ? isPairCorrect(left) : undefined;
              const color = matchColors[left];

              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => (matchedRight ? unmatchLeft(left) : handleLeftClick(left))}
                    disabled={showFeedback}
                    style={{
                      borderColor: matchedRight ? color : undefined,
                      backgroundColor: matchedRight ? color : selected ? '#E9D5FF' : undefined,
                      color: matchedRight ? '#fff' : undefined,
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition flex items-center justify-between ${
                      !matchedRight && selected
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    <span className="truncate">{left}</span>
                    <span className={`ml-3 text-xs ${matchedRight ? 'text-white' : 'text-gray-500'}`}>
                      {matchedRight ? <span className="font-medium">Matched</span> : <span className="text-gray-400">Tap to select</span>}
                    </span>
                  </button>
                  {checked && (
                    <div className={`ml-3 text-sm font-semibold ${correctFlag ? 'text-green-700' : 'text-red-600'}`}>
                      {correctFlag ? '✓' : '✗'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div className="text-sm">
          <h4 className="text-sm font-semibold text-blue-700 mb-3">Right</h4>
          <div className="space-y-2">
            {rightItems.map((right, i) => {
              const matchedLeft = Object.entries(matches).find(([, r]) => r === right)?.[0];
              const color = matchedLeft ? matchColors[matchedLeft] : undefined;
              const disabled = showFeedback || !!matchedLeft;
              const isCorrectRight = normalizedPairs.some(p => p.right === right && matches[p.left] === right);

              return (
                <button
                  key={i}
                  onClick={() => handleRightClick(right)}
                  disabled={disabled}
                  style={{
                    borderColor: color,
                    backgroundColor: color,
                    color: color ? '#fff' : undefined,
                  }}
                  className={`w-full text-left p-3 rounded-lg border-2 transition flex items-center justify-between ${
                    matchedLeft && !showFeedback ? '' : 'border-gray-300 hover:border-blue-400'
                  } ${showFeedback && isCorrectRight ? 'ring-2 ring-green-100' : ''}`}
                >
                  <span className="truncate">{right}</span>
                  {matchedLeft && <span className="text-xs text-white ml-2">→ {matchedLeft}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div>
        {!showFeedback ? (
          <div className="flex gap-3">
            <button
              onClick={checkMatches}
              disabled={!allMatched}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              Check Matches
            </button>
            <button
              onClick={() => {
                setMatches({});
                setMatchColors({});
                setSelectedLeft(null);
                setRightItems(shuffle(normalizedPairs.map(p => p.right)));
                setChecked(null);
              }}
              className="px-4 py-3 border rounded-lg"
            >
              Reset
            </button>
          </div>
        ) : (
          <>
            {checked && checked.isCorrect ? (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="font-bold text-green-800">🎉 All matches correct!</div>
                {content.explanation && <div className="mt-2 text-gray-700" dangerouslySetInnerHTML={{ __html: content.explanation }} />}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="font-bold text-red-800">❌ Some matches are incorrect.</div>
                {content.explanation && <div className="mt-2 text-gray-700" dangerouslySetInnerHTML={{ __html: content.explanation }} />}
                {revealCorrectOnFail && (
                  <div className="mt-3 text-sm">
                    <div className="font-semibold mb-1">Correct matches:</div>
                    <ul className="list-disc list-inside text-gray-700">
                      {normalizedPairs.map((p, i) => (
                        <li key={i}>
                          <span className="font-medium">{p.left}</span> — {p.right}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

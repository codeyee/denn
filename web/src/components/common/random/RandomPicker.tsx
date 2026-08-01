import { useEffect, useMemo, useRef, useState } from "react";
import { Dices, Sparkles } from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import { cn } from "@/lib/utils/tailwindUtils";
import { RandomPickerResult } from "./RandomPickerResult";
import { RandomPickerTrack } from "./RandomPickerTrack";
import {
  buildRollingSequence,
  buildSpinSequence,
  ensureSpinSequence,
  getRollStopIndex,
  getTargetIndex,
  ROLL_DURATION_MS,
  ROLL_START_INDEX,
  SETTLE_DURATION_MS,
  useReducedMotion,
  wait,
} from "./randomPickerUtils";
import type { RandomPickerItem, RandomPickerPhase } from "./types";

export type { RandomPickerItem } from "./types";

export interface RandomPickerProps {
  title: string;
  description: string;
  previewItems: RandomPickerItem[];
  emptyMessage: string;
  onDraw: (excludeContentId: number | null) => Promise<RandomPickerItem | null>;
  onStart?: (item: RandomPickerItem) => Promise<void>;
  className?: string;
  showHeading?: boolean;
  autoDrawOnOpen?: boolean;
}

export function RandomPicker({
  title,
  description,
  previewItems,
  emptyMessage,
  onDraw,
  onStart,
  className,
  showHeading = true,
  autoDrawOnOpen = false,
}: RandomPickerProps) {
  const [phase, setPhase] = useState<RandomPickerPhase>("idle");
  const [result, setResult] = useState<RandomPickerItem | null>(null);
  const [sequence, setSequence] = useState<RandomPickerItem[]>([]);
  const [rollingPreview, setRollingPreview] =
    useState<RandomPickerItem | null>(null);
  const [trackIndex, setTrackIndex] = useState(ROLL_START_INDEX);
  const [targetIndex, setTargetIndex] = useState(
    getTargetIndex(ROLL_START_INDEX),
  );
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const reducedMotion = useReducedMotion();

  const isBusy = phase === "rolling" || phase === "settling" || isStarting;

  async function draw() {
    if (isBusy) return;
    const nextTargetIndex = getTargetIndex(trackIndex);
    setError(null);
    setTargetIndex(nextTargetIndex);
    setPhase("rolling");
    setSequence((currentSequence) =>
      ensureSpinSequence(currentSequence, previewItems, nextTargetIndex),
    );

    try {
      const [drawn] = await Promise.all([
        onDraw(result?.contentId ?? null),
        reducedMotion ? Promise.resolve() : wait(ROLL_DURATION_MS),
      ]);

      if (!drawn) {
        setResult(null);
        setRollingPreview(null);
        const stoppedIndex = getRollStopIndex(nextTargetIndex);
        setTrackIndex(stoppedIndex);
        setTargetIndex(stoppedIndex);
        setPhase("settled");
        return;
      }

      setResult(drawn);
      setSequence((currentSequence) =>
        buildSpinSequence(
          currentSequence,
          previewItems,
          drawn,
          nextTargetIndex,
        ),
      );
      if (reducedMotion) {
        setPhase("settled");
      } else {
        setPhase("settling");
        window.setTimeout(() => setPhase("settled"), SETTLE_DURATION_MS);
      }
    } catch (drawError) {
      const stoppedIndex = getRollStopIndex(nextTargetIndex);
      setTrackIndex(stoppedIndex);
      setTargetIndex(stoppedIndex);
      setPhase("settled");
      setError(
        drawError instanceof Error
          ? drawError.message
          : "Could not choose an item right now.",
      );
    }
  }

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    if (autoDrawOnOpen) void drawRef.current();
  }, [autoDrawOnOpen]);

  async function startResult() {
    if (!result || !onStart || isStarting) return;
    setError(null);
    setIsStarting(true);
    try {
      await onStart(result);
      setResult({ ...result, status: "in_progress" });
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Could not update tracking.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  const canStart = Boolean(
    result &&
      onStart &&
      result.status !== "in_progress" &&
      result.status !== "completed",
  );
  const idleSequence = useMemo(
    () => buildRollingSequence(previewItems),
    [previewItems],
  );
  const displaySequence = sequence.length > 0 ? sequence : idleSequence;
  const visibleResult = phase === "settled" ? result : rollingPreview;

  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-white/10 bg-white/5 p-6",
        className,
      )}
    >
      {showHeading ? (
        <div className="mb-4 flex items-start gap-3">
          <Sparkles
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="mt-1 text-sm text-white/60">{description}</p>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <div aria-hidden="true">
          <RandomPickerTrack
            items={displaySequence}
            phase={phase}
            startIndex={trackIndex}
            targetIndex={targetIndex}
            onCenterItemChange={setRollingPreview}
            onSettledIndexChange={setTrackIndex}
          />
        </div>
      </div>

      <Button
        onClick={() => void draw()}
        disabled={isBusy}
        className="w-full justify-center gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        size="lg"
      >
        <Dices className="h-5 w-5" aria-hidden="true" />
        {phase === "rolling" || phase === "settling"
          ? "Choosing…"
          : result
            ? "Choose another"
            : "Choose for me"}
      </Button>

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "settled" && !result && !error ? (
        <p className="mt-4 text-sm text-white/65" role="status">
          {emptyMessage}
        </p>
      ) : null}

      <RandomPickerResult
        result={visibleResult}
        isPreview={phase !== "settled"}
        canStart={canStart}
        isStarting={isStarting}
        onStart={() => void startResult()}
      />
    </section>
  );
}

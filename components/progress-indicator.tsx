"use client";

/**
 * Progress Indicator Components
 *
 * Provides various progress indicators for long-running operations
 */

import { useState, useEffect, useCallback } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Progress state
 */
export interface ProgressState {
  current: number;
  total: number;
  status: "idle" | "running" | "paused" | "completed" | "error";
  message?: string;
  currentItem?: string;
  startTime?: number;
  errors: string[];
}

/**
 * Linear progress bar with details
 */
interface ProgressBarProps {
  progress: ProgressState;
  showPercentage?: boolean;
  showETA?: boolean;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
}

export function ProgressBar({
  progress,
  showPercentage = true,
  showETA = true,
  onCancel,
  onPause,
  onResume,
  className,
}: ProgressBarProps) {
  const percentage =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const eta = useETA(progress.current, progress.total, progress.startTime);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {progress.status === "running" && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {progress.status === "completed" && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {progress.status === "error" && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          {progress.status === "paused" && (
            <Pause className="h-4 w-4 text-yellow-500" />
          )}
          <span className="font-medium">
            {progress.message || getStatusMessage(progress.status)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {showPercentage && (
            <span className="text-muted-foreground">{percentage}%</span>
          )}
          {showETA && progress.status === "running" && eta && (
            <span className="text-muted-foreground">ETA: {eta}</span>
          )}
        </div>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {progress.current} / {progress.total}
          {progress.currentItem && ` - ${progress.currentItem}`}
        </span>
        <div className="flex items-center gap-2">
          {progress.status === "running" && onPause && (
            <Button variant="ghost" size="sm" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          {progress.status === "paused" && onResume && (
            <Button variant="ghost" size="sm" onClick={onResume}>
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
          {(progress.status === "running" || progress.status === "paused") &&
            onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
        </div>
      </div>

      {progress.errors.length > 0 && (
        <div className="mt-2 p-2 bg-destructive/10 rounded-md">
          <p className="text-sm font-medium text-destructive">
            {progress.errors.length} error(s)
          </p>
          <ul className="text-xs text-destructive mt-1 space-y-1">
            {progress.errors.slice(0, 3).map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
            {progress.errors.length > 3 && (
              <li>...and {progress.errors.length - 3} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Operation progress card with summary
 */
interface OperationProgressProps {
  title: string;
  description?: string;
  progress: ProgressState;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
}

export function OperationProgress({
  title,
  description,
  progress,
  onCancel,
  onPause,
  onResume,
  onComplete,
}: OperationProgressProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{title}</span>
          {progress.status === "completed" && onComplete && (
            <Button size="sm" onClick={onComplete}>
              Done
            </Button>
          )}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ProgressBar
          progress={progress}
          onCancel={onCancel}
          onPause={onPause}
          onResume={onResume}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Step progress indicator
 */
interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  status?: "running" | "completed" | "error";
}

export function StepProgress({
  steps,
  currentStep,
  status = "running",
}: StepProgressProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div key={step.id} className="flex items-start gap-4">
            {/* Step indicator */}
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0",
                isCompleted &&
                  "bg-primary border-primary text-primary-foreground",
                isCurrent &&
                  status === "running" &&
                  "border-primary text-primary",
                isCurrent &&
                  status === "error" &&
                  "border-destructive text-destructive",
                isPending && "border-muted text-muted-foreground",
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : isCurrent && status === "running" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isCurrent && status === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pb-8 border-l-2 border-muted ml-4 pl-4 -mt-2">
              <p
                className={cn(
                  "font-medium",
                  isPending && "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper functions

function getStatusMessage(status: ProgressState["status"]): string {
  switch (status) {
    case "idle":
      return "Ready";
    case "running":
      return "Processing...";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "error":
      return "Error occurred";
    default:
      return "";
  }
}

function useETA(
  current: number,
  total: number,
  startTime?: number,
): string | null {
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    if (!startTime || current === 0 || current >= total) {
      setEta(null);
      return;
    }

    const elapsed = Date.now() - startTime;
    const rate = current / elapsed;
    const remaining = (total - current) / rate;

    if (remaining < 1000) {
      setEta("< 1s");
    } else if (remaining < 60000) {
      setEta(`${Math.ceil(remaining / 1000)}s`);
    } else if (remaining < 3600000) {
      setEta(`${Math.ceil(remaining / 60000)}m`);
    } else {
      setEta(`${Math.ceil(remaining / 3600000)}h`);
    }
  }, [current, total, startTime]);

  return eta;
}

/**
 * Hook for managing progress state
 */
export function useProgress(total: number = 0) {
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total,
    status: "idle",
    errors: [],
  });

  const start = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      status: "running",
      startTime: Date.now(),
      current: 0,
      errors: [],
    }));
  }, []);

  const increment = useCallback((message?: string, currentItem?: string) => {
    setProgress((prev) => ({
      ...prev,
      current: prev.current + 1,
      message,
      currentItem,
      status: prev.current + 1 >= prev.total ? "completed" : prev.status,
    }));
  }, []);

  const addError = useCallback((error: string) => {
    setProgress((prev) => ({
      ...prev,
      errors: [...prev.errors, error],
    }));
  }, []);

  const pause = useCallback(() => {
    setProgress((prev) => ({ ...prev, status: "paused" }));
  }, []);

  const resume = useCallback(() => {
    setProgress((prev) => ({ ...prev, status: "running" }));
  }, []);

  const complete = useCallback(() => {
    setProgress((prev) => ({ ...prev, status: "completed" }));
  }, []);

  const reset = useCallback(() => {
    setProgress({
      current: 0,
      total,
      status: "idle",
      errors: [],
    });
  }, [total]);

  const setTotal = useCallback((newTotal: number) => {
    setProgress((prev) => ({ ...prev, total: newTotal }));
  }, []);

  return {
    progress,
    start,
    increment,
    addError,
    pause,
    resume,
    complete,
    reset,
    setTotal,
  };
}

'use client';

import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepProps {
  stepNumber: number;
  label: string;
  isCompleted: boolean;
  isActive: boolean;
}

const Step = ({ stepNumber, label, isCompleted, isActive }: StepProps) => (
  <div className="flex items-center gap-2">
    {isCompleted ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : isActive ? (
      <div className="w-5 h-5 border-2 border-primary rounded-full flex items-center justify-center">
        <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
      </div>
    ) : (
      <Circle className="h-5 w-5 text-muted-foreground" />
    )}
    <span
      className={cn(
        'text-sm font-medium',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      {stepNumber}. {label}
    </span>
  </div>
);

export function BoxBuilderStepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: 'Welcome' },
    { number: 2, label: 'Pricing' },
    { number: 3, label: 'Build Your Box' },
    { number: 4, label: 'Payment' },
  ];

  return (
    <div className="flex items-center justify-center space-x-4 sm:space-x-8 border-b pb-4">
      {steps.map((step) => (
        <Step
          key={step.number}
          stepNumber={step.number}
          label={step.label}
          isCompleted={step.number < currentStep}
          isActive={step.number === currentStep}
        />
      ))}
    </div>
  );
}

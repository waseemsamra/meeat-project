'use client';

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ProductOptionGroupProps {
    title: string;
    options: string[];
    selected: string;
    onSelect: (option: string) => void;
}

export function ProductOptionGroup({ title, options, selected, onSelect }: ProductOptionGroupProps) {
    return (
        <div>
            <Label className="font-semibold mb-2 block">{title}</Label>
            <div className="flex flex-wrap gap-3">
                {options.map((option, index) => (
                    <Button
                        key={`${option}-${index}`}
                        type="button"
                        variant="outline"
                        onClick={() => onSelect(option)}
                        className={cn(
                            "font-normal",
                            selected === option && "border-accent ring-1 ring-accent"
                        )}
                    >
                        {option}
                    </Button>
                ))}
            </div>
        </div>
    )
}

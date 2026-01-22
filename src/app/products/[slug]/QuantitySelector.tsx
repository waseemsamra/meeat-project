
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
    quantity: number;
    setQuantity: (quantity: number) => void;
}

export function QuantitySelector({ quantity, setQuantity }: QuantitySelectorProps) {
    
    const handleIncrement = () => setQuantity(quantity + 0.5);
    const handleDecrement = () => setQuantity(Math.max(0.5, quantity - 0.5));

    return (
        <div className="flex items-center gap-2 border rounded-md p-1">
            <Button variant="ghost" size="icon" onClick={handleDecrement} className="h-8 w-8">
                <Minus className="h-4 w-4" />
            </Button>
            <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                className="w-16 h-8 text-center border-0 focus-visible:ring-0"
                step="0.5"
                min="0.5"
            />
            <Button variant="ghost" size="icon" onClick={handleIncrement} className="h-8 w-8">
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    );
}

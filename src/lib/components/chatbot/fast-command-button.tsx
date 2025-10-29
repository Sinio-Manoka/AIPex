import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "~/lib/components/ui/icon";
import { cn } from "@/lib/utils";

interface FastCommandButtonProps {
    onClick?: () => void;
    className?: string;
}

export const FastCommandButton: React.FC<FastCommandButtonProps> = ({
    onClick,
    className
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Button
            variant="ghost"
            size="sm"
            className={cn(
                "relative overflow-hidden transition-all duration-500 ease-in-out hover:scale-105",
                "text-muted-foreground hover:text-foreground",
                "bg-transparent hover:bg-accent hover:shadow-md",
                "border border-border hover:border-accent-foreground/20",
                "min-w-[40px] w-auto",
                isHovered ? "px-2" : "px-2",
                "group",
                className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <div className={cn("flex items-center transition-all duration-500 ease-out", isHovered && "gap-2")}>
                <Icon
                    name="settings"
                    size="sm"
                    variant={isHovered ? "default" : "muted"}
                    className="transition-all duration-700 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110"
                />
                <span
                    className={cn(
                        "transition-all duration-500 ease-out overflow-hidden whitespace-nowrap",
                        isHovered
                            ? "max-w-[120px] opacity-100 translate-x-0"
                            : "max-w-0 opacity-0 -translate-x-2"
                    )}
                >
                    commands
                </span>
            </div>
        </Button>
    );
};
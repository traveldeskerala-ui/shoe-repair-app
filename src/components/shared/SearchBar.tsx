import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    resultsCount?: number;
    totalCount?: number;
}

export function SearchBar({ value, onChange, placeholder = "Search orders...", resultsCount, totalCount }: SearchBarProps) {
    const [localValue, setLocalValue] = useState(value);
    const [isSearching, setIsSearching] = useState(false);

    // Debounce search input
    useEffect(() => {
        setIsSearching(true);
        const timer = setTimeout(() => {
            onChange(localValue);
            setIsSearching(false);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [localValue]);

    // Sync with external value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <div className="w-full">
            <div className="relative group">
                <Search className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
                    isSearching ? "text-cyan-400 animate-pulse" : "text-slate-400 group-hover:text-slate-300"
                )} size={18} />
                <input
                    type="text"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all hover:bg-white/[0.07]"
                />
                {localValue && (
                    <button
                        onClick={() => {
                            setLocalValue("");
                            onChange("");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all hover:scale-110"
                        title="Clear search"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
            {value && resultsCount !== undefined && totalCount !== undefined && (
                <p className="text-xs text-slate-400 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {isSearching ? (
                        <span className="text-cyan-400">Searching...</span>
                    ) : (
                        <>Showing <span className="text-cyan-400 font-semibold">{resultsCount}</span> of {totalCount} orders</>
                    )}
                </p>
            )}
        </div>
    );
}

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    resultsCount?: number;
    totalCount?: number;
}

export function SearchBar({ value, onChange, placeholder = "Search orders...", resultsCount, totalCount }: SearchBarProps) {
    return (
        <div className="w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
                {value && (
                    <button
                        onClick={() => onChange("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        title="Clear search"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
            {value && resultsCount !== undefined && totalCount !== undefined && (
                <p className="text-xs text-slate-400 mt-2">
                    Showing {resultsCount} of {totalCount} orders
                </p>
            )}
        </div>
    );
}

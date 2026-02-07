import { AnimatePresence, motion } from "framer-motion";
import {
    Check,
    Crosshair,
    Lightbulb,
    Plus,
    Rocket,
    Search,
    ShieldAlert,
    Target,
    Users,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ValidationMatrixProps {
    identity: any;
    strategy: any;
    onConfirm: (finalQueries: string[]) => void;
    onCancel: () => void;
    isExecuting: boolean;
}

export function ValidationMatrix(
    { identity, strategy, onConfirm, onCancel, isExecuting }:
        ValidationMatrixProps,
) {
    const [queries, setQueries] = useState<string[]>(strategy?.queries || []);
    const [newQuery, setNewQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Sync if strategy changes
    useEffect(() => {
        if (strategy?.queries) setQueries(strategy.queries);
    }, [strategy]);

    const handleRemoveQuery = (index: number) => {
        setQueries((prev) => prev.filter((_, i) => i !== index));
    };

    const handleAddQuery = () => {
        if (newQuery.trim()) {
            setQueries((prev) => [...prev, newQuery.trim()]);
            setNewQuery("");
            setIsAdding(false);
        }
    };

    if (!identity || !strategy) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-5xl mx-auto p-4 space-y-6"
        >
            {/* COCKPIT HEADER */}
            <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-mono tracking-widest uppercase mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse">
                    </span>
                    Flight Check
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
                    Cockpit de Validation
                </h2>
                <p className="text-slate-400 max-w-lg mx-auto text-sm">
                    Confirmez les paramètres de mission avant le lancement.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* CARD 1: STRATEGIC ANGLE (LEFT) */}
                <Card className="bg-slate-900/60 border-slate-800/60 p-0 overflow-hidden backdrop-blur-xl flex flex-col h-full shadow-2xl">
                    <div className="p-1.5 pl-6 bg-gradient-to-r from-violet-500/10 to-transparent border-b border-indigo-500/20 flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-violet-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-violet-300">
                            Angle d'Attaque
                        </h3>
                    </div>

                    <div className="p-6 space-y-6 flex-1">
                        {/* PERSONA */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                                <Users className="w-3.5 h-3.5" />
                                <span>Cible Prioritaire</span>
                            </div>
                            <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-indigo-200 shadow-inner">
                                <p className="font-medium text-lg">
                                    {strategy.persona ||
                                        identity.ideal_prospect_profile ||
                                        "Cible Non-Définie"}
                                </p>
                            </div>
                        </div>

                        {/* ANGLE */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                                <Lightbulb className="w-3.5 h-3.5" />
                                <span>Angle Stratégique</span>
                            </div>
                            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200 shadow-inner">
                                <p className="italic text-sm leading-relaxed">
                                    "{strategy.angle ||
                                        identity.unique_value_proposition ||
                                        "Approche standard"}"
                                </p>
                            </div>
                        </div>

                        {/* PAIN POINTS (Mini) */}
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Symptômes Clés</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {identity.core_pain_points?.slice(0, 5).map((
                                    pain: string,
                                    i: number,
                                ) => (
                                    <Badge
                                        key={i}
                                        variant="outline"
                                        className="bg-slate-950/50 border-slate-800 text-slate-400 text-[10px] font-normal"
                                    >
                                        {pain}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* CARD 2: TACTICAL QUERIES (RIGHT) */}
                <Card className="bg-slate-900/60 border-slate-800/60 p-0 overflow-hidden backdrop-blur-xl flex flex-col h-full shadow-2xl">
                    <div className="p-1.5 pl-6 bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-emerald-500/20 flex items-center gap-2">
                        <Search className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                            Vecteurs de Recherche
                        </h3>
                    </div>

                    <div className="p-6 flex flex-col h-full space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                                {queries.length} Requêtes Actives
                            </span>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-400"
                                onClick={() => setIsAdding(!isAdding)}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 content-start flex-1 min-h-[200px]">
                            <AnimatePresence>
                                {queries.map((query, i) => (
                                    <motion.div
                                        key={`${query}-${i}`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        layout
                                    >
                                        <Badge className="pl-3 pr-1 py-1.5 bg-slate-950 border border-slate-800 text-emerald-300/90 hover:border-emerald-500/30 text-xs font-mono flex items-center gap-2 group transition-all">
                                            <span
                                                className="max-w-[200px] truncate"
                                                title={query}
                                            >
                                                {query}
                                            </span>
                                            <div
                                                role="button"
                                                onClick={() =>
                                                    handleRemoveQuery(i)}
                                                className="p-0.5 rounded-full hover:bg-slate-800 text-slate-600 group-hover:text-slate-400 transition-colors cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </div>
                                        </Badge>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* ADD NEW INPUT */}
                            {isAdding && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "auto", opacity: 1 }}
                                    className="flex items-center gap-2"
                                >
                                    <Input
                                        autoFocus
                                        value={newQuery}
                                        onChange={(e) =>
                                            setNewQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleAddQuery();
                                            }
                                            if (
                                                e.key === "Escape"
                                            ) setIsAdding(false);
                                        }}
                                        className="h-8 w-48 text-xs bg-slate-950 border-slate-700 focus:border-emerald-500"
                                        placeholder="Nouvelle requête..."
                                    />
                                    <Button
                                        size="icon"
                                        className="h-8 w-8 bg-emerald-600 hover:bg-emerald-500"
                                        onClick={handleAddQuery}
                                    >
                                        <Check className="w-4 h-4" />
                                    </Button>
                                </motion.div>
                            )}
                        </div>

                        <div className="bg-slate-950/30 p-3 rounded border border-slate-800/50 text-center">
                            <p className="text-[10px] text-slate-500">
                                <span className="text-amber-500 font-bold">
                                    INFO:
                                </span>{" "}
                                Supprimez les termes trop génériques (ex:
                                "SaaS") pour améliorer la précision.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex items-center justify-center gap-6 pt-8">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isExecuting}
                    className="text-slate-500 hover:text-white hover:bg-transparent"
                >
                    Annuler la mission
                </Button>

                <Button
                    onClick={() => onConfirm(queries)}
                    disabled={isExecuting || queries.length === 0}
                    className={cn(
                        "relative bg-emerald-600 hover:bg-emerald-500 text-white min-w-[240px] h-14 text-lg rounded-xl gap-3 font-bold tracking-wide transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:shadow-[0_0_60px_rgba(16,185,129,0.4)] hover:scale-105",
                        isExecuting &&
                            "opacity-80 animate-pulse cursor-not-allowed",
                        queries.length === 0 && "opacity-50 grayscale",
                    )}
                >
                    {isExecuting
                        ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                DÉCOLLAGE...
                            </>
                        )
                        : (
                            <>
                                <Rocket className="w-5 h-5 fill-current" />
                                VALIDER & LANCER
                            </>
                        )}
                </Button>
            </div>
        </motion.div>
    );
}

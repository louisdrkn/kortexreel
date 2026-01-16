import { motion } from "framer-motion";
import { Check, Search, ShieldAlert, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ValidationMatrixProps {
    identity: any;
    strategy: any;
    onConfirm: () => void;
    onCancel: () => void;
    isExecuting: boolean;
}

export function ValidationMatrix(
    { identity, strategy, onConfirm, onCancel, isExecuting }:
        ValidationMatrixProps,
) {
    if (!identity || !strategy) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl mx-auto p-6 space-y-6"
        >
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-widest uppercase flex items-center justify-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-amber-500" />
                    Validation Stratégique
                </h2>
                <p className="text-slate-400">
                    Kortex a analysé votre ADN. Confirmez la stratégie de chasse
                    avant le déploiement.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IDENTITY CARD */}
                <Card className="bg-slate-900/80 border-slate-700 p-6 space-y-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-violet-400 mb-2">
                        <Target className="w-5 h-5" />
                        <h3 className="font-semibold uppercase tracking-wider">
                            Cible Identifiée
                        </h3>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-bold">
                                Proposition de Valeur Unique
                            </span>
                            <p className="text-sm text-slate-200">
                                {identity.unique_value_proposition}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs text-slate-500 uppercase font-bold">
                                Douleurs Cœurs (Pain Points)
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {identity.core_pain_points?.map((
                                    pain: string,
                                    i: number,
                                ) => (
                                    <span
                                        key={i}
                                        className="px-2 py-1 bg-red-950/30 text-red-300 border border-red-900/50 rounded text-xs"
                                    >
                                        {pain}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* STRATEGY CARD */}
                <Card className="bg-slate-900/80 border-slate-700 p-6 space-y-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <Search className="w-5 h-5" />
                        <h3 className="font-semibold uppercase tracking-wider">
                            Plan de Chasse
                        </h3>
                    </div>

                    <div className="space-y-3">
                        <span className="text-xs text-slate-500 uppercase font-bold">
                            Requêtes de Symptômes
                        </span>
                        <div className="space-y-2">
                            {strategy.queries?.map((
                                query: string,
                                i: number,
                            ) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 p-2 rounded bg-slate-950/50 border border-slate-800"
                                >
                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-500 font-mono">
                                        {i + 1}
                                    </div>
                                    <code className="text-xs text-emerald-400/90 font-mono flex-1">
                                        {query}
                                    </code>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isExecuting}
                    className="border-slate-700 text-slate-400 hover:text-white"
                >
                    Annuler
                </Button>

                <Button
                    onClick={onConfirm}
                    disabled={isExecuting}
                    className={cn(
                        "bg-emerald-600 hover:bg-emerald-500 text-white min-w-[200px] gap-2 font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]",
                        isExecuting && "opacity-80 animate-pulse",
                    )}
                >
                    {isExecuting ? <>Déploiement en cours...</> : (
                        <>
                            <Check className="w-4 h-4" />
                            VALIDER & LANCER
                        </>
                    )}
                </Button>
            </div>
        </motion.div>
    );
}

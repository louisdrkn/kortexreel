import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, Globe, Loader2, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import kortexLogoGradient from "@/assets/kortex-logo-gradient.png";
import confetti from "canvas-confetti";

interface OnboardingData {
  agencyName: string;
  clientName: string;
  clientWebsite: string;
}

type Step = 1 | 2 | 3;

const steps = [
  { id: 1, title: "Identité Agence", icon: Building2 },
  { id: 2, title: "Premier Client", icon: Users },
  { id: 3, title: "Lancement", icon: Rocket },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    agencyName: "",
    clientName: "",
    clientWebsite: "",
  });

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!data.agencyName.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom de l'agence est requis",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!data.clientName.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom du client est requis",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // ÉTAPE 1: Récupérer le org_id du profil
      const { data: profile, error: profileFetchError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileFetchError) {
        console.error("Failed to fetch profile:", profileFetchError);
        throw new Error("Impossible de récupérer votre profil");
      }

      let orgId = profile?.org_id;

      // ÉTAPE 2: Gérer l'organisation
      if (orgId) {
        await supabase
          .from("organizations")
          .update({
            name: data.agencyName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orgId);
      } else {
        const { data: newOrg, error: orgError } = await supabase
          .from("organizations")
          .insert({ name: data.agencyName })
          .select("id")
          .single();

        if (orgError) {
          console.error("Failed to create organization:", orgError);
          throw new Error("Impossible de créer votre espace agence");
        }
        orgId = newOrg.id;
      }

      // ÉTAPE 3: CRÉER LE PROJET EN PREMIER (CRITIQUE)
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: data.clientName,
          user_id: user.id,
        })
        .select("id, name")
        .single();

      if (projectError) {
        console.error("Failed to create project:", projectError);
        throw new Error("Impossible de créer le projet. Veuillez réessayer.");
      }

      if (!project || !project.id) {
        throw new Error("Le projet n'a pas été créé correctement");
      }

      console.log("Project created successfully:", project.id);

      // ÉTAPE 4: Stocker l'URL du client dans project_data (si fournie)
      if (data.clientWebsite.trim()) {
        const { error: dataError } = await supabase.from("project_data").insert(
          {
            project_id: project.id,
            user_id: user.id,
            data_type: "agency_brain",
            data: { companyWebsite: data.clientWebsite },
          },
        );

        if (dataError) {
          console.warn(
            "Failed to save client website, continuing anyway:",
            dataError,
          );
        }
      }

      // ÉTAPE 5: Marquer l'onboarding comme complété (UPSERT pour gérer le cas où le profil n'existe pas)
      console.log("[ONBOARDING] Upserting profile for user:", user.id);
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: data.agencyName,
          onboarding_completed: true,
          org_id: orgId,
          updated_at: new Date().toISOString(),
        });

      if (profileUpdateError) {
        console.error(
          "[ONBOARDING] Failed to update profile:",
          profileUpdateError,
        );
        throw new Error("Impossible de finaliser la configuration locale");
      }

      console.log("[ONBOARDING] Profile upserted successfully");

      // Verification log
      const { data: verifyData } = await supabase.from("profiles").select(
        "onboarding_completed",
      ).eq("id", user.id).single();
      console.log("[ONBOARDING] Verification after upsert:", verifyData);

      console.log("Onboarding marked as completed");

      // ÉTAPE 6: Sauvegarder le projet actif dans localStorage pour le ProjectContext
      localStorage.setItem("currentProjectId", project.id);

      // Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast({
        title: "Bienvenue !",
        description: "Votre espace agence est prêt",
      });

      // Laisser le temps à l'utilisateur de voir le confetti
      setTimeout(() => {
        // ÉTAPE 7: Redirection FORCÉE pour recharger AuthGuard avec le nouveau statut
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    currentStep >= step.id
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "border-slate-700 text-slate-500"
                  }`}
                >
                  {currentStep > step.id
                    ? <Check className="w-5 h-5" />
                    : <step.icon className="w-5 h-5" />}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-24 sm:w-32 h-0.5 mx-2 transition-all duration-300 ${
                      currentStep > step.id ? "bg-violet-600" : "bg-slate-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            {steps.map((step) => (
              <span
                key={step.id}
                className={currentStep >= step.id ? "text-violet-400" : ""}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 pt-32">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 shadow-2xl">
                <div className="flex justify-center mb-6">
                  <img src={kortexLogoGradient} alt="Kortex" className="h-12" />
                </div>

                <h1 className="text-2xl font-bold text-white text-center mb-2">
                  Bienvenue sur Kortex
                </h1>
                <p className="text-slate-400 text-center mb-8">
                  Configurez votre espace agence en quelques secondes
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="agencyName" className="text-slate-300">
                      Nom de votre agence
                    </Label>
                    <Input
                      id="agencyName"
                      placeholder="Ex: Kortex Agency"
                      value={data.agencyName}
                      onChange={(e) =>
                        setData({ ...data, agencyName: e.target.value })}
                      className="mt-2 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full mt-6 h-12 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-medium rounded-xl"
                >
                  Continuer →
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Premier dossier client
                    </h2>
                    <p className="text-sm text-slate-400">
                      Créez votre premier projet pour démarrer
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientName" className="text-slate-300">
                      Nom du client
                    </Label>
                    <Input
                      id="clientName"
                      placeholder="Ex: Acme Corporation"
                      value={data.clientName}
                      onChange={(e) =>
                        setData({ ...data, clientName: e.target.value })}
                      className="mt-2 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12"
                      autoFocus
                    />
                  </div>

                  <div>
                    <Label htmlFor="clientWebsite" className="text-slate-300">
                      Site web du client{" "}
                      <span className="text-slate-500">(optionnel)</span>
                    </Label>
                    <div className="relative mt-2">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <Input
                        id="clientWebsite"
                        placeholder="https://acme.com"
                        value={data.clientWebsite}
                        onChange={(e) =>
                          setData({ ...data, clientWebsite: e.target.value })}
                        className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    ← Retour
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-medium rounded-xl"
                  >
                    Continuer →
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 shadow-2xl text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-2">
                  Votre espace agence est prêt !
                </h2>
                <p className="text-slate-400 mb-8">
                  <span className="text-violet-400 font-medium">
                    {data.agencyName}
                  </span>{" "}
                  est configuré. Votre premier projet{" "}
                  <span className="text-violet-400 font-medium">
                    {data.clientName}
                  </span>{" "}
                  vous attend.
                </p>

                <div className="space-y-3">
                  {[
                    {
                      text: `Organisation "${data.agencyName}" créée`,
                      delay: 0,
                    },
                    {
                      text: `Projet "${data.clientName}" initialisé`,
                      delay: 0.1,
                    },
                    ...(data.clientWebsite
                      ? [{
                        text: "URL client enregistrée pour analyse",
                        delay: 0.2,
                      }]
                      : []),
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + item.delay }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 text-left"
                    >
                      <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-sm text-slate-300">
                        {item.text}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                >
                  <Button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="w-full mt-8 h-12 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-violet-500/25 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {isLoading
                      ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Configuration...
                        </>
                      )
                      : (
                        <>
                          <Rocket className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                          Accéder au Cockpit
                        </>
                      )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-slate-600">
        Étape {currentStep} sur 3
      </div>
    </div>
  );
}

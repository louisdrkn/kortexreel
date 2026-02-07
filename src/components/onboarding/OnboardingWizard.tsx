import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Check,
  FileText,
  Globe,
  Key,
  Link2,
  Shield,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface OnboardingWizardProps {
  userName?: string;
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

export interface OnboardingData {
  role: string;
  targetSector: string;
  targetFunction: string;
  hasUploadedDocument: boolean;
  companyUrl?: string;
  companyName?: string;
  companyPitch?: string;
  detectedICP?: string[];
}

interface ConnectionStatus {
  magileads: boolean;
  unipile: boolean;
  openai: boolean;
}

// Typewriter effect component
function TypewriterText(
  { text, onComplete }: { text: string; onComplete?: () => void },
) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return <span>{displayText}</span>;
}

export function OnboardingWizard(
  { userName = "Utilisateur", onComplete, onSkip }: OnboardingWizardProps,
) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    role: "",
    targetSector: "",
    targetFunction: "",
    hasUploadedDocument: false,
    companyUrl: "",
    companyName: "",
    companyPitch: "",
    detectedICP: [],
  });

  // Step 1 states
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [showBusinessCard, setShowBusinessCard] = useState(false);
  const [typewriterComplete, setTypewriterComplete] = useState(false);

  // Step 2 states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisLabels] = useState([
    "Lecture de la structure...",
    "Analyse de la proposition de valeur...",
    "Détection des segments cibles...",
    "Extraction des personas...",
    "Finalisation de l'ICP...",
  ]);
  const [currentLabel, setCurrentLabel] = useState(0);
  const [detectedICP, setDetectedICP] = useState<string[]>([]);

  // Step 3 states
  const [connections, setConnections] = useState<ConnectionStatus>({
    magileads: false,
    unipile: false,
    openai: false,
  });
  const [connectingService, setConnectingService] = useState<string | null>(
    null,
  );

  // Final transition
  const [isTransitioning, setIsTransitioning] = useState(false);

  const totalSteps = 3;

  const handleWebsiteScan = async () => {
    if (!websiteUrl) return;

    setIsScanning(true);

    // Simulate scanning
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Extract domain name for company name
    let domain = websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "");
    domain = domain.split("/")[0].split(".")[0];
    const companyName = domain.charAt(0).toUpperCase() + domain.slice(1);

    setData((prev) => ({
      ...prev,
      companyUrl: websiteUrl,
      companyName: companyName,
      companyPitch:
        `${companyName} accompagne les entreprises dans leur transformation digitale avec des solutions innovantes et sur-mesure.`,
    }));

    setIsScanning(false);
    setScanComplete(true);
    setShowBusinessCard(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentLabel(0);

    // Simulate analysis with progress
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setCurrentLabel(i);
      setAnalysisProgress((i + 1) * 20);
    }

    // Set detected ICP
    setDetectedICP(["PME Industrie 4.0", "Directeurs RSE", "Scale-ups Tech"]);
    setData((prev) => ({
      ...prev,
      hasUploadedDocument: true,
      detectedICP: ["PME Industrie 4.0", "Directeurs RSE", "Scale-ups Tech"],
    }));

    setIsAnalyzing(false);
  };

  const handleConnect = async (service: keyof ConnectionStatus) => {
    setConnectingService(service);

    // Simulate connection
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setConnections((prev) => ({ ...prev, [service]: true }));
    setConnectingService(null);
  };

  const handleFinalTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onComplete(data);
      navigate("/cockpit");
    }, 800);
  };

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const stepVariants = {
    enter: { opacity: 0, y: 20 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const allConnected = connections.magileads && connections.unipile &&
    connections.openai;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50">
      <motion.div
        layoutId="onboarding-card"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{
          scale: isTransitioning ? 1.5 : 1,
          opacity: isTransitioning ? 0 : 1,
          y: isTransitioning ? -100 : 0,
        }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-2xl mx-4"
      >
        {/* Premium Card Container */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-200/50">
          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 pt-8 pb-2">
            {[0, 1, 2].map((step) => (
              <motion.div
                key={step}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors duration-300",
                  currentStep === step ? "bg-violet-600" : "bg-slate-200",
                )}
                animate={{ scale: currentStep === step ? 1.2 : 1 }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative min-h-[480px] px-10 py-8">
            <AnimatePresence mode="wait">
              {/* STEP 1: Website Identification */}
              {currentStep === 0 && (
                <motion.div
                  key="step-1"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col"
                >
                  {!showBusinessCard
                    ? (
                      <>
                        <h1 className="mb-2 text-2xl font-medium tracking-tight text-slate-900">
                          Bienvenue sur Kortex.
                        </h1>
                        <p className="mb-10 text-slate-500">
                          Commençons par votre site.
                        </p>

                        <div className="relative mb-8">
                          <Input
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            placeholder="Ex: www.votre-agence.com"
                            disabled={isScanning}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleWebsiteScan()}
                            className={cn(
                              "h-14 text-lg border-slate-200 bg-white px-5",
                              "focus:ring-2 focus:ring-violet-100 focus:border-violet-500",
                              "placeholder:text-slate-400 transition-all duration-300",
                              isScanning && "opacity-50",
                            )}
                          />
                          {isScanning && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute right-4 top-1/2 -translate-y-1/2"
                            >
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                            </motion.div>
                          )}
                        </div>

                        <Button
                          onClick={handleWebsiteScan}
                          disabled={!websiteUrl || isScanning}
                          size="lg"
                          className={cn(
                            "h-12 bg-violet-600 hover:bg-violet-700 text-white",
                            "shadow-lg shadow-violet-200/50 transition-all duration-300",
                          )}
                        >
                          {isScanning
                            ? (
                              <>
                                <Globe className="mr-2 h-4 w-4 animate-pulse" />
                                Analyse en cours...
                              </>
                            )
                            : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Scanner le site
                              </>
                            )}
                        </Button>
                      </>
                    )
                    : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col"
                      >
                        {/* Business Card */}
                        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 shadow-lg shadow-slate-100/50">
                          <div className="flex items-start gap-4">
                            {/* Logo placeholder */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: 0.2,
                                type: "spring",
                                stiffness: 200,
                              }}
                              className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-200/50"
                            >
                              <span className="text-2xl font-bold">
                                {data.companyName?.charAt(0) || "K"}
                              </span>
                            </motion.div>

                            <div className="flex-1">
                              <motion.h3
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-xl font-semibold text-slate-900"
                              >
                                {typewriterComplete
                                  ? (
                                    data.companyName
                                  )
                                  : (
                                    <TypewriterText
                                      text={data.companyName || ""}
                                      onComplete={() =>
                                        setTypewriterComplete(true)}
                                    />
                                  )}
                              </motion.h3>
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{
                                  opacity: typewriterComplete ? 1 : 0,
                                }}
                                transition={{ delay: 0.2, duration: 0.3 }}
                                className="mt-2 text-sm text-slate-500 leading-relaxed"
                              >
                                {data.companyPitch}
                              </motion.p>
                            </div>
                          </div>

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                              opacity: typewriterComplete ? 1 : 0,
                              y: typewriterComplete ? 0 : 10,
                            }}
                            transition={{ delay: 0.3, duration: 0.3 }}
                            className="mt-4 flex items-center gap-2 text-xs text-slate-400"
                          >
                            <Globe className="h-3 w-3" />
                            {websiteUrl}
                          </motion.div>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{
                            opacity: typewriterComplete ? 1 : 0,
                            y: typewriterComplete ? 0 : 20,
                          }}
                          transition={{ delay: 0.4, duration: 0.3 }}
                        >
                          <Button
                            onClick={nextStep}
                            size="lg"
                            className={cn(
                              "w-full h-12 bg-violet-600 hover:bg-violet-700 text-white",
                              "shadow-lg shadow-violet-200/50",
                            )}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            C'est exact
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                </motion.div>
              )}

              {/* STEP 2: Document Upload & ICP Detection */}
              {currentStep === 1 && (
                <motion.div
                  key="step-2"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                      <Brain className="h-5 w-5 text-violet-600" />
                    </div>
                    <h1 className="text-2xl font-medium tracking-tight text-slate-900">
                      Nourrissez le cerveau de l'agence.
                    </h1>
                  </div>
                  <p className="mb-8 text-slate-500">
                    Glissez votre Pitch Deck ou votre Offre (PDF). L'IA va en
                    extraire votre Cible Idéale.
                  </p>

                  {!isAnalyzing && detectedICP.length === 0
                    ? (
                      <label
                        htmlFor="file-upload-step2"
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center",
                          "rounded-2xl border border-slate-100 bg-slate-50/50 p-12",
                          "transition-all duration-300 hover:border-violet-200 hover:bg-violet-50/30",
                        )}
                      >
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100">
                          <Upload className="h-7 w-7 text-violet-600" />
                        </div>
                        <p className="mb-1 font-medium text-slate-700">
                          Glissez un fichier ici
                        </p>
                        <p className="text-sm text-slate-400">
                          PDF, DOCX, PPTX (max 10 Mo)
                        </p>
                        <input
                          id="file-upload-step2"
                          type="file"
                          accept=".pdf,.docx,.pptx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )
                    : isAnalyzing
                    ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8"
                      >
                        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${analysisProgress}%` }}
                            className="h-full bg-gradient-to-r from-violet-500 to-violet-600"
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <div className="space-y-2">
                          {analysisLabels.map((label, index) => (
                            <motion.p
                              key={label}
                              initial={{ opacity: 0.3 }}
                              animate={{
                                opacity: index <= currentLabel ? 1 : 0.3,
                                color: index === currentLabel
                                  ? "#7c3aed"
                                  : "#64748b",
                              }}
                              className="text-sm transition-colors"
                            >
                              {index < currentLabel && (
                                <Check className="inline h-3 w-3 mr-1 text-emerald-500" />
                              )}
                              {label}
                            </motion.p>
                          ))}
                        </div>
                      </motion.div>
                    )
                    : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
                          <div className="mb-4 flex items-center gap-2">
                            <Check className="h-5 w-5 text-emerald-600" />
                            <span className="font-medium text-emerald-700">
                              Cibles Idéales Détectées
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {detectedICP.map((icp, index) => (
                              <motion.span
                                key={icp}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                  "inline-flex items-center rounded-full px-4 py-2",
                                  "bg-white border border-slate-200 text-sm font-medium text-slate-700",
                                  "shadow-sm hover:border-violet-300 hover:bg-violet-50 transition-colors cursor-pointer",
                                )}
                              >
                                {icp}
                              </motion.span>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={nextStep}
                          size="lg"
                          className={cn(
                            "w-full h-12 bg-violet-600 hover:bg-violet-700 text-white",
                            "shadow-lg shadow-violet-200/50",
                          )}
                        >
                          Confirmer les cibles
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}

                  {!isAnalyzing && detectedICP.length === 0 && (
                    <button
                      onClick={nextStep}
                      className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Passer cette étape
                    </button>
                  )}
                </motion.div>
              )}

              {/* STEP 3: Connections */}
              {currentStep === 2 && (
                <motion.div
                  key="step-3"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                      <Link2 className="h-5 w-5 text-violet-600" />
                    </div>
                    <h1 className="text-2xl font-medium tracking-tight text-slate-900">
                      Synchronisation des Canaux.
                    </h1>
                  </div>
                  <p className="mb-8 text-slate-500">
                    Connectez vos services pour activer l'intelligence
                    commerciale.
                  </p>

                  <div className="space-y-3 mb-8">
                    {/* Magileads */}
                    <ConnectionModule
                      name="Magileads"
                      description="Base de données B2B"
                      icon={<Zap className="h-5 w-5" />}
                      isConnected={connections.magileads}
                      isConnecting={connectingService === "magileads"}
                      onConnect={() => handleConnect("magileads")}
                    />

                    {/* Unipile */}
                    <ConnectionModule
                      name="Unipile"
                      description="Automatisation LinkedIn"
                      icon={<Link2 className="h-5 w-5" />}
                      isConnected={connections.unipile}
                      isConnecting={connectingService === "unipile"}
                      onConnect={() => handleConnect("unipile")}
                    />

                    {/* OpenAI */}
                    <ConnectionModule
                      name="OpenAI"
                      description="Intelligence Artificielle"
                      icon={<Brain className="h-5 w-5" />}
                      isConnected={connections.openai}
                      isConnecting={connectingService === "openai"}
                      onConnect={() => handleConnect("openai")}
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 mb-6">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span>Vos clés API sont chiffrées et sécurisées.</span>
                  </div>

                  <Button
                    onClick={handleFinalTransition}
                    disabled={!allConnected}
                    size="lg"
                    className={cn(
                      "w-full h-14 text-lg font-medium transition-all duration-300",
                      allConnected
                        ? "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200/50"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed",
                    )}
                  >
                    {allConnected
                      ? (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          ACCÉDER AU COCKPIT
                        </>
                      )
                      : (
                        "Connectez tous les services"
                      )}
                  </Button>

                  {!allConnected && (
                    <button
                      onClick={handleFinalTransition}
                      className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Configurer plus tard
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Connection Module Component
function ConnectionModule({
  name,
  description,
  icon,
  isConnected,
  isConnecting,
  onConnect,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        borderColor: isConnected ? "rgb(167, 243, 208)" : "rgb(241, 245, 249)",
        backgroundColor: isConnected ? "rgba(167, 243, 208, 0.1)" : "white",
      }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex items-center justify-between rounded-xl border p-4",
        "transition-all duration-300",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
            isConnected
              ? "bg-emerald-100 text-emerald-600"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {icon}
        </div>
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {isConnected
        ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100"
          >
            <Check className="h-4 w-4 text-emerald-600" />
          </motion.div>
        )
        : (
          <Button
            onClick={onConnect}
            disabled={isConnecting}
            variant="outline"
            size="sm"
            className={cn(
              "h-9 border-slate-200 text-slate-600",
              "hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600",
              "transition-all duration-200",
            )}
          >
            {isConnecting
              ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
              )
              : (
                <>
                  <Key className="mr-1.5 h-3.5 w-3.5" />
                  Connecter
                </>
              )}
          </Button>
        )}
    </motion.div>
  );
}

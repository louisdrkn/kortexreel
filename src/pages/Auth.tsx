import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { z } from "zod";
import neonBrain from "@/assets/kortex-brain-neon.png";

const emailSchema = z.string().email("Adresse email invalide");
const passwordSchema = z.string().min(
  6,
  "Le mot de passe doit contenir au moins 6 caractères",
);

export default function Auth() {
  const navigate = useNavigate();
  const { user, signUp, signIn, isLoading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return;
    }

    // Check password confirmation for signup
    if (isSignUp && password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Un compte existe déjà avec cette adresse email");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Compte créé avec succès !");
        navigate("/");
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou mot de passe incorrect");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Connexion réussie !");
        navigate("/");
      }
    } catch (error: any) {
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden p-4">
      {/* Background Texture - Neural Network Simulation */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]">
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full">
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center gap-8">
        {/* Logo Integration */}
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <img
            src={neonBrain}
            alt="Kortex Brain"
            className="h-24 object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"
          />
        </div>

        {/* Glassmorphism Card */}
        <Card className="w-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)] rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-6 border-b border-white/5">
            <CardTitle className="text-2xl font-bold text-white tracking-tight">
              {isSignUp ? "Initialisation du Compte" : "Connexion Système"}
            </CardTitle>
            <CardDescription className="text-zinc-400 font-mono text-xs uppercase tracking-wider">
              {isSignUp
                ? "Création d'identité numérique"
                : "Authentification requise pour l'accès"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-zinc-400 font-mono text-xs uppercase"
                >
                  Identifiant / Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="agent@kortex.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 hover:border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-zinc-400 font-mono text-xs uppercase"
                >
                  Mot de passe
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 hover:border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-indigo-400 focus:outline-none transition-colors"
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-zinc-400 font-mono text-xs uppercase"
                  >
                    Confirmation
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 hover:border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-indigo-400 focus:outline-none transition-colors"
                    >
                      {showConfirmPassword
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.6)] transition-all duration-300 border border-indigo-400/20"
                disabled={isLoading}
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <ArrowRight className="h-4 w-4 mr-2" />}
                {isSignUp ? "INITIALISER LE COMPTE" : "ACCÉDER AU SYSTÈME"}
              </Button>
            </form>

            <div className="mt-8 text-center border-t border-white/5 pt-6">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs font-mono text-zinc-500 hover:text-indigo-400 transition-colors uppercase tracking-widest hover:underline decoration-indigo-500/30 underline-offset-4"
                disabled={isLoading}
              >
                {isSignUp
                  ? "Compte existant ? Se connecter"
                  : "Nouvel agent ? S'initialiser"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

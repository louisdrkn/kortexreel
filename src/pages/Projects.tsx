import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  FolderOpen,
  Loader2,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/ui/company-logo";
import { supabase } from "@/integrations/supabase/client";

// Store project websites for logo display
type ProjectWebsite = Record<string, string | null>;

export default function Projects() {
  const navigate = useNavigate();
  const {
    projects,
    isLoading,
    createProject,
    deleteProject,
    setCurrentProject,
  } = useProject();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectWebsites, setProjectWebsites] = useState<ProjectWebsite>({});

  // Fetch client websites for all projects
  useEffect(() => {
    const fetchProjectWebsites = async () => {
      if (projects.length === 0) return;

      const { data } = await supabase
        .from("project_data")
        .select("project_id, data")
        .in("project_id", projects.map((p) => p.id))
        .eq("data_type", "client_website");

      if (data) {
        const websites: ProjectWebsite = {};
        data.forEach((row) => {
          const dataObj = row.data as { url?: string } | null;
          websites[row.project_id] = dataObj?.url || null;
        });
        setProjectWebsites(websites);
      }
    };

    fetchProjectWebsites();
  }, [projects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du projet est requis",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    const project = await createProject(newProjectName.trim());
    setIsCreating(false);

    if (project) {
      toast({
        title: "Projet créé",
        description: `"${project.name}" a été créé`,
      });
      setNewProjectName("");
      setDialogOpen(false);
      setCurrentProject(project);
      navigate("/strategie/cerveau");
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet",
        variant: "destructive",
      });
    }
  };

  const handleOpenProject = (project: typeof projects[0]) => {
    setCurrentProject(project);
    navigate("/strategie/cerveau");
  };

  const handleDeleteProject = async (id: string, name: string) => {
    try {
      await deleteProject(id);
      toast({
        title: "Projet supprimé",
        description: `"${name}" a été supprimé`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          "Impossible de supprimer le projet. Des données liées empêchent peut-être la suppression.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Mes Projets</h1>
            <p className="text-muted-foreground">
              Gérez vos différents clients et campagnes commerciales
            </p>
            {user && (
              <p className="text-sm text-muted-foreground">
                Connecté en tant que {user.email}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Nouveau Projet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau projet</DialogTitle>
                  <DialogDescription>
                    Donnez un nom à votre projet (ex: nom du client ou de la
                    campagne)
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Ex: Campagne SNCF Q1 2024"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  autoFocus
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleCreateProject} disabled={isCreating}>
                    {isCreating
                      ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Création...
                        </>
                      )
                      : (
                        "Créer"
                      )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading
          ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )
          : projects.length === 0
          ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Aucun projet</h3>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Créez votre premier projet pour commencer à prospecter et
                  générer des propositions commerciales.
                </p>
                <Button
                  onClick={() => setDialogOpen(true)}
                  size="lg"
                  className="gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Créer mon premier projet
                </Button>
              </CardContent>
            </Card>
          )
          : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className={cn(
                    "group transition-all duration-300 cursor-pointer",
                    "hover:border-violet-200",
                    "hover:shadow-[0_20px_50px_-12px_rgba(124,58,237,0.25)]",
                  )}
                  onClick={() => handleOpenProject(project)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Premium Logo with Clearbit auto-discovery */}
                        <CompanyLogo
                          name={project.name}
                          website={projectWebsites[project.id]}
                          size="md"
                        />
                        <div>
                          <CardTitle className="text-lg text-zinc-100 font-semibold">
                            {project.name}
                          </CardTitle>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Supprimer le projet ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Toutes les données
                              du projet "{project.name}" seront perdues.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteProject(project.id, project.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(project.updated_at), "d MMM yyyy", {
                          locale: fr,
                        })}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

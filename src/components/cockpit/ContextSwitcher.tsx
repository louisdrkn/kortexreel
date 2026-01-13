import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  Search, 
  Building2, 
  User, 
  Plus,
  Sparkles
} from "lucide-react";
import { useProject, Project } from "@/contexts/ProjectContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextSwitcherProps {
  onContextChange?: () => void;
}

export function ContextSwitcher({ onContextChange }: ContextSwitcherProps) {
  const { projects, currentProject, setCurrentProject, createProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  const handleSelectProject = async (project: Project) => {
    setCurrentProject(project);
    setIsOpen(false);
    setSearchQuery("");
    onContextChange?.();
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    const newProject = await createProject(newProjectName.trim());
    if (newProject) {
      setCurrentProject(newProject);
      onContextChange?.();
    }
    setNewProjectName("");
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Context Switcher Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl",
          "bg-white/5 backdrop-blur-md border border-white/10",
          "hover:bg-white/10 hover:border-violet-500/30",
          "hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]",
          "transition-all duration-300 group"
        )}
      >
        {/* Project Logo/Icon */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-indigo-500/30 flex items-center justify-center border border-white/10">
          <Building2 className="h-4 w-4 text-violet-400" />
        </div>
        
        {/* Project Info */}
        <div className="flex flex-col items-start">
          <span className="text-white text-sm font-medium truncate max-w-[150px]">
            {currentProject?.name || "Sélectionner un projet"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">IA Active</span>
          </div>
        </div>

        <ChevronDown className="h-4 w-4 text-white/50 group-hover:text-white/70 transition-colors ml-2" />
      </button>

      {/* Project Selection Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              Choisir une Mission
            </DialogTitle>
          </DialogHeader>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Rechercher un projet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-violet-500/50"
            />
          </div>

          {/* Projects List */}
          <div className="mt-4 space-y-1 max-h-[300px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => (
                <motion.button
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSelectProject(project)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left",
                    "transition-all duration-200",
                    currentProject?.id === project.id
                      ? "bg-violet-500/20 border border-violet-500/30"
                      : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    currentProject?.id === project.id
                      ? "bg-violet-500/30"
                      : "bg-white/10"
                  )}>
                    <Building2 className={cn(
                      "h-5 w-5",
                      currentProject?.id === project.id ? "text-violet-400" : "text-white/60"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{project.name}</p>
                    <p className="text-xs text-white/50">Niveau 2 • Client</p>
                  </div>
                  {currentProject?.id === project.id && (
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>

            {filteredProjects.length === 0 && searchQuery && (
              <div className="text-center py-8 text-white/40">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun projet trouvé pour "{searchQuery}"</p>
              </div>
            )}
          </div>

          {/* Create New Project */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                placeholder="Nouveau projet..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Button
                onClick={handleCreateProject}
                disabled={isCreating || !newProjectName.trim()}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

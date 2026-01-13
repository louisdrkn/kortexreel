import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useLocation } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';

const tourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Bienvenue dans le Cerveau 🧠',
    content: "Kortex n'est pas un simple annuaire. C'est une machine de guerre commerciale. Ce guide rapide va vous montrer comment transformer un inconnu en client signé. Suivez le flux.",
    locale: { next: 'Démarrer la visite' },
  },
  {
    target: '[data-tour="sidebar-radar"]',
    placement: 'right',
    disableBeacon: true,
    title: '1. La Détection 📡',
    content: "Ici, l'IA scanne le marché en temps réel selon VOS critères. Elle ne cherche pas juste des entreprises, elle cherche des signaux d'affaires et filtre les résultats pour ne garder que le top 1%.",
  },
  {
    target: '[data-tour="company-card"], [data-tour="scan-button"]',
    placement: 'bottom',
    disableBeacon: true,
    title: "2. L'Identification 🕵️‍♂️",
    content: "Passez la souris sur une carte pour révéler les actions. Utilisez la Loupe pour scanner instantanément le Décideur (CEO, DRH...) sans quitter la page. L'IA vérifie s'il est toujours en poste.",
  },
  {
    target: '[data-tour="transfer-button"]',
    placement: 'top',
    disableBeacon: true,
    title: '3. Le Verrouillage 🔒',
    content: "C'est l'étape la plus importante. Une cible vous plaît ? Cliquez ici pour la transférer dans votre Tour de Contrôle. Cela sauvegarde le prospect et lance l'analyse stratégique approfondie.",
  },
  {
    target: '[data-tour="sidebar-prospects"]',
    placement: 'right',
    disableBeacon: true,
    title: '4. La Stratégie ♟️',
    content: "Une fois transférés, vos prospects atterrissent ici. C'est votre bureau de travail. L'IA aura déjà digéré leur site web, leur actu, et préparé vos angles d'attaque personnalisés.",
  },
  {
    target: '[data-tour="sidebar-sequences"]',
    placement: 'right',
    disableBeacon: true,
    title: "5. L'Engagement 📨",
    content: "Fini le page blanche. Ici, générez des campagnes de messages (Email/LinkedIn) ultra-personnalisées basées sur l'analyse de la Fiche Prospect. L'IA rédige, vous validez.",
  },
  {
    target: '[data-tour="sidebar-rdv"]',
    placement: 'right',
    disableBeacon: true,
    title: '6. La Victoire 🏆',
    content: "L'objectif final. Dès qu'un prospect répond positivement, il arrive ici. C'est votre tableau de chasse et votre agenda de closing.",
  },
];

const TOUR_STORAGE_KEY = 'kortex_master_tour_completed';

export function KortexMasterTour() {
  const location = useLocation();
  const { currentProject } = useProject();
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check if tour should run
  useEffect(() => {
    const shouldShowTour = () => {
      // Only show on /radar or /dashboard routes
      const validRoutes = ['/radar', '/dashboard'];
      const isValidRoute = validRoutes.some((route) => location.pathname.startsWith(route));

      // Must have a project selected
      if (!currentProject) return false;
      if (!isValidRoute) return false;

      // Check if tour was already completed
      const tourKey = `${TOUR_STORAGE_KEY}_${currentProject.id}`;
      const completed = localStorage.getItem(tourKey);
      if (completed === 'true') return false;

      return true;
    };

    // Small delay to let the DOM settle
    const timer = setTimeout(() => {
      if (shouldShowTour()) {
        setRunTour(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.pathname, currentProject]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      // Mark tour as completed
      if (currentProject) {
        const tourKey = `${TOUR_STORAGE_KEY}_${currentProject.id}`;
        localStorage.setItem(tourKey, 'true');
      }
      setRunTour(false);
      setStepIndex(0);
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Update step index
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextIndex);
    }
  };

  if (!runTour) return null;

  return (
    <Joyride
      steps={tourSteps}
      run={runTour}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      spotlightClicks={false}
      callback={handleJoyrideCallback}
      locale={{
        back: 'Retour',
        close: 'Fermer',
        last: 'Terminer',
        next: 'Suivant',
        skip: 'Passer le tour',
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#8b5cf6',
          backgroundColor: '#ffffff',
          textColor: '#1e293b',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(15, 23, 42, 0.85)',
        },
        spotlight: {
          borderRadius: 12,
        },
        tooltip: {
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
        tooltipTitle: {
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 8,
          color: '#0f172a',
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.6,
          color: '#475569',
        },
        buttonNext: {
          backgroundColor: '#8b5cf6',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
        },
        buttonBack: {
          marginRight: 10,
          color: '#64748b',
          fontSize: 14,
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: 13,
        },
        beacon: {
          display: 'none',
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}

// Hook to manually trigger the tour
export function useKortexTour() {
  const { currentProject } = useProject();

  const resetTour = () => {
    if (currentProject) {
      const tourKey = `${TOUR_STORAGE_KEY}_${currentProject.id}`;
      localStorage.removeItem(tourKey);
      window.location.reload();
    }
  };

  return { resetTour };
}

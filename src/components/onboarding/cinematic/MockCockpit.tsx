import { motion } from "framer-motion";
import { useState } from "react";
import { Building2, Users, Mail, Phone, Linkedin, TrendingUp, Zap, Calendar } from "lucide-react";

interface MockCockpitProps {
  variant: "empty" | "immobilier" | "restaurant" | "tech";
  showContacts?: boolean;
  showAlert?: boolean;
  alertClicked?: boolean;
}

const variantConfig = {
  empty: {
    title: "Nouveau Projet",
    color: "from-gray-500 to-gray-600",
    widgets: [],
  },
  immobilier: {
    title: "Agence Immobilière Luxe",
    color: "from-amber-500 to-orange-600",
    widgets: [
      { label: "Mandats actifs", value: "24", icon: Building2 },
      { label: "Visites planifiées", value: "12", icon: Calendar },
      { label: "Prospects qualifiés", value: "156", icon: Users },
    ],
  },
  restaurant: {
    title: "Restaurant Marco",
    color: "from-red-500 to-rose-600",
    widgets: [
      { label: "Réservations", value: "42", icon: Calendar },
      { label: "Couverts/semaine", value: "280", icon: Users },
      { label: "Avis Google", value: "4.6★", icon: TrendingUp },
    ],
  },
  tech: {
    title: "TechCorp SaaS",
    color: "from-blue-500 to-cyan-600",
    widgets: [
      { label: "Leads MQL", value: "89", icon: Users },
      { label: "Demos bookées", value: "7", icon: Calendar },
      { label: "Pipeline", value: "€45K", icon: TrendingUp },
    ],
  },
};

const mockContacts = [
  { name: "Sarah Mitchell", title: "VP of Sales", email: "s.mitchell@tesla.com", verified: true },
  { name: "Michael Chen", title: "Head of Partnerships", email: "m.chen@tesla.com", verified: true },
  { name: "Jennifer Walsh", title: "Director of BD", email: "j.walsh@tesla.com", verified: true },
];

export function MockCockpit({ variant, showContacts = false, showAlert = false, alertClicked = false }: MockCockpitProps) {
  const config = variantConfig[variant];

  return (
    <div className="min-h-screen bg-[#09090B] text-foreground">
      {/* Mock Header */}
      <header className="border-b border-white/[0.08] bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Kortex</span>
          </div>

          {/* Context Switcher */}
          <motion.div
            id="mock-context-switcher"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
            whileHover={{ scale: 1.02 }}
          >
            <div className={`w-6 h-6 rounded bg-gradient-to-br ${config.color}`} />
            <span className="text-sm font-medium">{config.title}</span>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </motion.div>

          {/* Profile */}
          <div className="w-8 h-8 rounded-full bg-white/10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Alert Banner */}
        {showAlert && (
          <motion.div
            id="mock-alert"
            className={`mb-6 p-4 rounded-lg border ${
              alertClicked 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-primary/10 border-primary/30"
            }`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${alertClicked ? "bg-green-500" : "bg-primary animate-pulse"}`} />
                <span className="font-medium">
                  {alertClicked 
                    ? "✓ Campagne multicanale lancée. Rendez-vous pris dans l'agenda."
                    : "Opportunité détectée : 3 prospects chauds"
                  }
                </span>
              </div>
              {!alertClicked && (
                <motion.button
                  id="mock-action-button"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Lancer la séquence
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* Widgets */}
        {variant !== "empty" && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {config.widgets.map((widget, index) => (
              <motion.div
                key={widget.label}
                className="p-6 rounded-xl bg-[#131316] border border-white/[0.08]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                    <widget.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold">{widget.value}</div>
                <div className="text-sm text-muted-foreground">{widget.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Contacts Section */}
        <div className="rounded-xl bg-[#131316] border border-white/[0.08] overflow-hidden">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Contacts</span>
            </div>
            
            {/* Search input for demo */}
            <div id="mock-search-input" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-muted-foreground">
              <span>tesla.com</span>
            </div>
          </div>

          <div className="p-4">
            {!showContacts ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun contact pour le moment</p>
                <p className="text-sm">Entrez un domaine pour commencer l'enrichissement</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mockContacts.map((contact, index) => (
                  <motion.div
                    key={contact.email}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/[0.05]"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.15 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-medium">
                      {contact.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contact.name}</span>
                        {contact.verified && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
                            ✓ Vérifié
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{contact.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <Linkedin className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

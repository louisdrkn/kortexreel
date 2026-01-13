import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PricingPackage } from "@/types/sales-pack";
import { cn } from "@/lib/utils";

interface PricingTabProps {
  packages: PricingPackage[];
}

export function PricingTab({ packages }: PricingTabProps) {
  const copyPackage = (pkg: PricingPackage) => {
    const text = `${pkg.name} - ${pkg.price}€\n${pkg.description}\n\nInclus :\n${pkg.features.map(f => `• ${f}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: `Package "${pkg.name}" copié.`,
    });
  };

  const copyAllPricing = () => {
    const text = packages.map(pkg => 
      `## ${pkg.name} - ${pkg.price}€\n${pkg.description}\n\n${pkg.features.map(f => `• ${f}`).join('\n')}`
    ).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "Tous les packages copiés.",
    });
  };

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Star className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Aucun package généré</p>
      </div>
    );
  }

  const getTierStyles = (tier: PricingPackage['tier']) => {
    switch (tier) {
      case 'essential':
        return 'border-border bg-card';
      case 'recommended':
        return 'border-accent bg-accent/5 ring-2 ring-accent';
      case 'premium':
        return 'border-primary bg-primary/5';
      default:
        return 'border-border bg-card';
    }
  };

  const getTierBadge = (tier: PricingPackage['tier']) => {
    switch (tier) {
      case 'essential':
        return <Badge variant="secondary">Essentiel</Badge>;
      case 'recommended':
        return <Badge variant="default" className="bg-accent text-accent-foreground">Recommandé</Badge>;
      case 'premium':
        return <Badge variant="outline" className="border-primary text-primary">Premium</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stratégie de prix</h3>
          <p className="text-sm text-muted-foreground mt-1">3 options adaptées au besoin client</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyAllPricing}>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copier tout
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {packages.map((pkg, index) => (
          <Card 
            key={index} 
            className={cn(
              "relative transition-all hover:shadow-medium",
              getTierStyles(pkg.tier),
              pkg.tier === 'recommended' && 'scale-[1.02] shadow-soft'
            )}
          >
            {pkg.tier === 'recommended' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground shadow-sm px-3 py-1">
                  <Star className="h-3 w-3 mr-1.5" />
                  Recommandé
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{pkg.description}</CardDescription>
                </div>
                {pkg.tier !== 'recommended' && getTierBadge(pkg.tier)}
              </div>
              <div className="pt-4">
                <span className="text-4xl font-bold">{pkg.price}</span>
                <span className="text-muted-foreground text-lg">€</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-5 pb-6">
              <ul className="space-y-3">
                {pkg.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0" />
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => copyPackage(pkg)}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copier ce package
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

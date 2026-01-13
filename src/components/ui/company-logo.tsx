import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CompanyLogoProps {
  name: string;
  website?: string | null;
  domain?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Extract clean domain from URL
function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
    return domain;
  } catch {
    // Fallback: try to extract domain from string
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

// Try to guess domain from company name (fallback)
function guessDomainFromName(name: string): string | null {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, '')
    .trim();
  
  if (!cleanName) return null;
  
  // Try common TLDs
  return `${cleanName}.com`;
}

// Generate elegant initials
function getInitials(name: string): string {
  return name
    .split(/[\s\-&]+/)
    .filter(word => word.length > 0)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

// Generate consistent gradient color from name
function getGradientColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-pink-600',
    'from-lime-500 to-green-600',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-base',
};

export function CompanyLogo({ name, website, domain, size = 'md', className }: CompanyLogoProps) {
  const [logoError, setLogoError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  
  // Priority: domain > website > guessed from name
  const extractedDomain = domain || extractDomain(website);
  const guessedDomain = guessDomainFromName(name);
  
  const primaryLogoUrl = extractedDomain ? `https://logo.clearbit.com/${extractedDomain}` : null;
  const fallbackLogoUrl = guessedDomain && !extractedDomain ? `https://logo.clearbit.com/${guessedDomain}` : null;
  
  const showPrimaryLogo = primaryLogoUrl && !logoError;
  const showFallbackLogo = !showPrimaryLogo && fallbackLogoUrl && !fallbackError;
  const showInitials = !showPrimaryLogo && !showFallbackLogo;
  
  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden',
        'bg-white border border-slate-200 shadow-sm',
        sizeClasses[size],
        className
      )}
    >
      {showPrimaryLogo && (
        <img
          src={primaryLogoUrl}
          alt={`${name} logo`}
          className="w-full h-full object-contain p-1.5"
          onError={() => setLogoError(true)}
          loading="lazy"
        />
      )}
      
      {showFallbackLogo && (
        <img
          src={fallbackLogoUrl}
          alt={`${name} logo`}
          className="w-full h-full object-contain p-1.5"
          onError={() => setFallbackError(true)}
          loading="lazy"
        />
      )}
      
      {showInitials && (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center',
            'bg-gradient-to-br text-white font-semibold tracking-tight',
            getGradientColor(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

export default CompanyLogo;

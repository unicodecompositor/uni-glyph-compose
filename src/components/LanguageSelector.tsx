import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/hooks/useLocale';
import { Globe } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { locale, setLocale, locales } = useLocale();
  
  const currentLocale = locales.find(l => l.code === locale);
  
  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as typeof locale)}>
      <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs bg-card border-border">
        <Globe className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span>{currentLocale?.flag}</span>
            <span className="hidden sm:inline">{currentLocale?.nativeName}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {locales.map((loc) => (
          <SelectItem key={loc.code} value={loc.code} className="text-xs">
            <span className="flex items-center gap-2">
              <span>{loc.flag}</span>
              <span>{loc.nativeName}</span>
              <span className="text-muted-foreground">({loc.name})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

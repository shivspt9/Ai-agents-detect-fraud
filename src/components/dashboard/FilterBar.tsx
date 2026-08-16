import { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { humanize } from './chart-theme';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  /** Multi-select facets, rendered as dropdown checklists. */
  facets?: {
    key: string;
    label: string;
    options: FilterOption[];
    selected: string[];
    onChange: (values: string[]) => void;
  }[];

  minConfidence: number;
  onMinConfidenceChange: (value: number) => void;

  /** Date presets, expressed in hours back from now. */
  rangeHours: number | null;
  onRangeChange: (hours: number | null) => void;

  onExport?: (format: 'csv' | 'json') => void;
  exportLabel?: string;

  resultCount: number;
  totalCount: number;
}

const RANGE_PRESETS = [
  { label: 'All time', hours: null },
  { label: 'Last hour', hours: 1 },
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 7 days', hours: 24 * 7 },
  { label: 'Last 30 days', hours: 24 * 30 },
];

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  facets = [],
  minConfidence,
  onMinConfidenceChange,
  rangeHours,
  onRangeChange,
  onExport,
  exportLabel = 'Export',
  resultCount,
  totalCount,
}: FilterBarProps) {
  // Local echo keeps typing responsive; the debounce below drives the query.
  const [draft, setDraft] = useState(search);

  useEffect(() => setDraft(search), [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== search) onSearchChange(draft);
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, search, onSearchChange]);

  const activeFacetCount = facets.reduce((acc, f) => acc + f.selected.length, 0);
  const hasFilters =
    Boolean(search) || activeFacetCount > 0 || minConfidence > 0 || rangeHours !== null;

  const clearAll = () => {
    setDraft('');
    onSearchChange('');
    facets.forEach((f) => f.onChange([]));
    onMinConfidenceChange(0);
    onRangeChange(null);
  };

  const rangeLabel =
    RANGE_PRESETS.find((p) => p.hours === rangeHours)?.label ?? 'All time';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={searchPlaceholder}
            className="rounded-xl border-white/10 bg-white/5 pl-9 pr-9"
          />
          {draft && (
            <button
              onClick={() => setDraft('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {facets.map((facet) => (
          <DropdownMenu key={facet.key}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 gap-2 rounded-xl border-white/10 bg-white/5',
                  facet.selected.length && 'border-primary/40 text-primary'
                )}
              >
                {facet.label}
                {facet.selected.length > 0 && (
                  <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px]">
                    {facet.selected.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
              <DropdownMenuLabel>{facet.label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {facet.options.length === 0 && (
                <DropdownMenuItem disabled>No options yet</DropdownMenuItem>
              )}
              {facet.options.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={facet.selected.includes(option.value)}
                  onCheckedChange={(checked) =>
                    facet.onChange(
                      checked
                        ? [...facet.selected, option.value]
                        : facet.selected.filter((v) => v !== option.value)
                    )
                  }
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-10 gap-2 rounded-xl border-white/10 bg-white/5',
                rangeHours !== null && 'border-primary/40 text-primary'
              )}
            >
              {rangeLabel}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {RANGE_PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => onRangeChange(preset.hours)}
                className={cn(rangeHours === preset.hours && 'font-semibold text-primary')}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-10 gap-2 rounded-xl border-white/10 bg-white/5',
                minConfidence > 0 && 'border-primary/40 text-primary'
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {minConfidence > 0 ? `≥ ${Math.round(minConfidence * 100)}%` : 'Confidence'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Minimum confidence</span>
                <span className="font-mono text-sm text-primary">
                  {Math.round(minConfidence * 100)}%
                </span>
              </div>
              <Slider
                value={[minConfidence * 100]}
                onValueChange={([v]) => onMinConfidenceChange(v / 100)}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Hide items the engine was less sure about.
              </p>
            </div>
          </PopoverContent>
        </Popover>

        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-2 rounded-xl border-white/10 bg-white/5"
              >
                <Download className="h-4 w-4" />
                {exportLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('csv')}>Download CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('json')}>Download JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{resultCount}</span> of {totalCount}
        </span>
        {facets.flatMap((facet) =>
          facet.selected.map((value) => (
            <Badge
              key={`${facet.key}-${value}`}
              variant="secondary"
              className="gap-1 rounded-lg pr-1 text-[11px]"
            >
              {humanize(value)}
              <button
                onClick={() => facet.onChange(facet.selected.filter((v) => v !== value))}
                aria-label={`Remove ${value} filter`}
                className="rounded p-0.5 hover:bg-white/10"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

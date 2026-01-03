"use client";

/**
 * Search and Filter Component
 *
 * Provides advanced search and filtering capabilities for lists
 */

import { useState, useCallback, useEffect } from "react";

import { Search, X, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

/**
 * Filter definition
 */
export interface FilterOption {
  id: string;
  label: string;
  type: "select" | "multiselect" | "text" | "date" | "boolean";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

/**
 * Active filter value
 */
export interface ActiveFilter {
  id: string;
  value: string | string[] | boolean | { from?: string; to?: string };
}

/**
 * Search and filter state
 */
export interface SearchFilterState {
  query: string;
  filters: ActiveFilter[];
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface SearchFilterProps {
  placeholder?: string;
  filters?: FilterOption[];
  sortOptions?: Array<{ value: string; label: string }>;
  defaultSortBy?: string;
  value: SearchFilterState;
  onChange: (state: SearchFilterState) => void;
  onClear?: () => void;
  debounceMs?: number;
}

export function SearchFilter({
  placeholder = "Search...",
  filters = [],
  sortOptions = [],
  defaultSortBy,
  value,
  onChange,
  onClear,
  debounceMs = 300,
}: SearchFilterProps) {
  const [localQuery, setLocalQuery] = useState(value.query);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== value.query) {
        onChange({ ...value, query: localQuery });
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localQuery, debounceMs, onChange, value]);

  const activeFilterCount = value.filters.length;

  const handleFilterChange = useCallback(
    (filterId: string, filterValue: ActiveFilter["value"]) => {
      const existingIndex = value.filters.findIndex((f) => f.id === filterId);
      let newFilters: ActiveFilter[];

      if (
        filterValue === undefined ||
        filterValue === "" ||
        (Array.isArray(filterValue) && filterValue.length === 0)
      ) {
        // Remove filter
        newFilters = value.filters.filter((f) => f.id !== filterId);
      } else if (existingIndex >= 0) {
        // Update filter
        newFilters = [...value.filters];
        newFilters[existingIndex] = { id: filterId, value: filterValue };
      } else {
        // Add filter
        newFilters = [...value.filters, { id: filterId, value: filterValue }];
      }

      onChange({ ...value, filters: newFilters });
    },
    [value, onChange],
  );

  const handleClearAll = useCallback(() => {
    setLocalQuery("");
    onChange({
      query: "",
      filters: [],
      sortBy: defaultSortBy || sortOptions[0]?.value || "",
      sortOrder: "desc",
    });
    onClear?.();
  }, [onChange, onClear, defaultSortBy, sortOptions]);

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange({
        ...value,
        filters: value.filters.filter((f) => f.id !== filterId),
      });
    },
    [value, onChange],
  );

  const getFilterLabel = (filter: ActiveFilter): string => {
    const filterDef = filters.find((f) => f.id === filter.id);
    if (!filterDef) {
      return "";
    }

    if (Array.isArray(filter.value)) {
      return `${filterDef.label}: ${filter.value.length} selected`;
    }
    if (typeof filter.value === "object" && filter.value !== null) {
      const dateFilter = filter.value as { from?: string; to?: string };
      return `${filterDef.label}: ${dateFilter.from || "..."} - ${dateFilter.to || "..."}`;
    }
    if (typeof filter.value === "boolean") {
      return `${filterDef.label}: ${filter.value ? "Yes" : "No"}`;
    }
    const option = filterDef.options?.find((o) => o.value === filter.value);
    return `${filterDef.label}: ${option?.label || filter.value}`;
  };

  return (
    <div className="space-y-3">
      {/* Search bar and controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={placeholder}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search"
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => setLocalQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter button */}
        {filters.length > 0 && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="default">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange({ ...value, filters: [] })}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <Separator />
                {filters.map((filter) => (
                  <FilterControl
                    key={filter.id}
                    filter={filter}
                    value={value.filters.find((f) => f.id === filter.id)?.value}
                    onChange={(val) => handleFilterChange(filter.id, val)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Sort dropdown */}
        {sortOptions.length > 0 && (
          <div className="flex items-center gap-1">
            <Select
              value={value.sortBy}
              onValueChange={(sortBy) => onChange({ ...value, sortBy })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                onChange({
                  ...value,
                  sortOrder: value.sortOrder === "asc" ? "desc" : "asc",
                })
              }
              aria-label={`Sort ${value.sortOrder === "asc" ? "descending" : "ascending"}`}
            >
              {value.sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        )}

        {/* Clear all button */}
        {(value.query || value.filters.length > 0) && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        )}
      </div>

      {/* Active filters */}
      {value.filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.filters.map((filter) => (
            <Badge key={filter.id} variant="secondary" className="gap-1 pr-1">
              {getFilterLabel(filter)}
              <button
                type="button"
                onClick={() => removeFilter(filter.id)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
                aria-label={`Remove ${filter.id} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Individual filter control
interface FilterControlProps {
  filter: FilterOption;
  value?: ActiveFilter["value"];
  onChange: (value: ActiveFilter["value"]) => void;
}

function FilterControl({ filter, value, onChange }: FilterControlProps) {
  switch (filter.type) {
    case "select":
      return (
        <div className="space-y-2">
          <Label>{filter.label}</Label>
          <Select
            value={(value as string) || ""}
            onValueChange={(v: string) => onChange(v || "")}
          >
            <SelectTrigger>
              <SelectValue placeholder={filter.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "multiselect":
      return (
        <div className="space-y-2">
          <Label>{filter.label}</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {filter.options?.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${filter.id}-${option.value}`}
                  checked={((value as string[]) || []).includes(option.value)}
                  onCheckedChange={(checked: boolean) => {
                    const current = (value as string[]) || [];
                    if (checked) {
                      onChange([...current, option.value]);
                    } else {
                      onChange(current.filter((v) => v !== option.value));
                    }
                  }}
                />
                <Label
                  htmlFor={`${filter.id}-${option.value}`}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={filter.id}
            checked={(value as boolean) || false}
            onCheckedChange={(checked: boolean) => onChange(checked)}
          />
          <Label htmlFor={filter.id} className="cursor-pointer">
            {filter.label}
          </Label>
        </div>
      );

    case "text":
      return (
        <div className="space-y-2">
          <Label>{filter.label}</Label>
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value || "")}
            placeholder={filter.placeholder}
          />
        </div>
      );

    default:
      return null;
  }
}

/**
 * Hook for managing search/filter state
 */
export function useSearchFilter(
  defaultState: Partial<SearchFilterState> = {},
): [SearchFilterState, (state: SearchFilterState) => void, () => void] {
  const [state, setState] = useState<SearchFilterState>({
    query: "",
    filters: [],
    sortBy: "",
    sortOrder: "desc",
    ...defaultState,
  });

  const reset = useCallback(() => {
    setState({
      query: "",
      filters: [],
      sortBy: defaultState.sortBy || "",
      sortOrder: defaultState.sortOrder || "desc",
    });
  }, [defaultState.sortBy, defaultState.sortOrder]);

  return [state, setState, reset];
}

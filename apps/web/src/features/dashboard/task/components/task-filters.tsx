"use client";

import { IconCalendar, IconSearch, IconX } from "@tabler/icons-react";
import { type ChangeEvent, useCallback } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TaskFiltersProps = {
  clearFilters: () => void;
  createdRange: DateRange | undefined;
  hasActiveFilters: boolean;
  onCreatedRangeChange: (range: DateRange | undefined) => void;
  onSearchChange: (value: string) => void;
  search: string;
};

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function formatCreatedRangeLabel(range: DateRange | undefined): string {
  if (range?.from === undefined) {
    return "Created date";
  }

  if (range.to === undefined) {
    return formatDateLabel(range.from);
  }

  return `${formatDateLabel(range.from)} – ${formatDateLabel(range.to)}`;
}

export function TaskFilters({
  clearFilters,
  createdRange,
  hasActiveFilters,
  onCreatedRangeChange,
  onSearchChange,
  search,
}: TaskFiltersProps) {
  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onSearchChange(event.target.value);
    },
    [onSearchChange]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <InputGroup className="sm:max-w-sm sm:flex-1">
        <InputGroupAddon align="inline-start">
          <IconSearch aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Search tasks"
          onChange={handleSearchChange}
          placeholder="Search tasks…"
          type="search"
          value={search}
        />
      </InputGroup>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger render={<Button type="button" variant="outline" />}>
            <IconCalendar aria-hidden data-icon="inline-start" />
            <span>{formatCreatedRangeLabel(createdRange)}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              defaultMonth={createdRange?.from}
              mode="range"
              numberOfMonths={1}
              onSelect={onCreatedRangeChange}
              selected={createdRange}
            />
          </PopoverContent>
        </Popover>

        {hasActiveFilters ? (
          <Button
            onClick={clearFilters}
            size="sm"
            type="button"
            variant="ghost"
          >
            <IconX aria-hidden data-icon="inline-start" />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

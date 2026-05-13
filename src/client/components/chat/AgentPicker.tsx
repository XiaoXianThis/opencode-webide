import { useEffect, useMemo } from "react";
import type { Key } from "react";
import { Bot } from "lucide-react";
import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Spinner,
} from "@heroui/react";
import { useAgentsStore, type AgentOption } from "@/store/agents";

export function filterAgentOptions(options: AgentOption[], query: string): AgentOption[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return options;
  return options.filter((option) =>
    [option.name, option.description ?? "", option.mode]
      .join(" ")
      .toLocaleLowerCase()
      .includes(needle),
  );
}

export function AgentPicker() {
  const status = useAgentsStore((s) => s.status);
  const options = useAgentsStore((s) => s.options);
  const selectedAgent = useAgentsStore((s) => s.selectedAgent);
  const load = useAgentsStore((s) => s.load);
  const select = useAgentsStore((s) => s.select);

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedAgent) ?? null,
    [options, selectedAgent],
  );

  const handleSelection = (key: Key | null) => {
    if (key == null) return;
    select(String(key));
  };

  return (
    <Autocomplete
      aria-label="Select agent"
      className="w-full min-w-0"
      size="sm"
      selectedKey={selectedAgent}
      onSelectionChange={handleSelection}
      isDisabled={status === "loading"}
    >
      <Autocomplete.Trigger>
        <Bot className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <Autocomplete.Value>
          {() => {
            if (status === "loading") {
              return (
                <span className="flex items-center gap-1.5 text-xs text-default-500">
                  <Spinner size="sm" />
                  Loading agents...
                </span>
              );
            }
            if (!selectedOption) {
              return <span className="text-xs text-default-500">Select agent</span>;
            }
            return (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-medium">{selectedOption.name}</span>
                <span className="truncate text-[10px] text-default-500">{selectedOption.mode}</span>
              </span>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>

      <Autocomplete.Popover className="w-72 max-w-[calc(100vw-2rem)]">
        <Autocomplete.Filter filter={filterAgentOptions}>
          <SearchField aria-label="Search agents">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search agents..." />
            </SearchField.Group>
          </SearchField>

          <ListBox
            className="max-h-72 overflow-y-auto"
            renderEmptyState={() => (
              <EmptyState className="px-3 py-4 text-center text-xs text-default-500">
                No matching agents
              </EmptyState>
            )}
          >
            {options.map((option) => (
              <ListBox.Item
                key={option.id}
                id={option.id}
                textValue={`${option.name} ${option.description ?? ""} ${option.mode}`}
              >
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <Label className="min-w-0 truncate font-medium">{option.name}</Label>
                    {option.builtIn && (
                      <span className="shrink-0 rounded bg-primary-500/20 px-1 text-[9px] uppercase tracking-wide text-primary-600">
                        built-in
                      </span>
                    )}
                    <span className="shrink-0 rounded bg-default-100 px-1 text-[9px] uppercase tracking-wide text-default-600">
                      {option.mode}
                    </span>
                  </div>
                  {option.description && (
                    <div className="truncate text-[10px] text-default-500">
                      {option.description}
                    </div>
                  )}
                  {option.model && (
                    <div className="truncate text-[10px] text-default-500">
                      {option.model.providerID}/{option.model.modelID}
                    </div>
                  )}
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

import { useEffect, useMemo } from "react";
import type { Key } from "react";
import { Cpu } from "lucide-react";
import {
  Autocomplete,
  EmptyState,
  Header,
  Label,
  ListBox,
  SearchField,
  Spinner,
} from "@heroui/react";
import { useModelsStore, type ModelOption } from "@/store/models";

function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

function formatCost(perToken: number): string {
  const per1M = perToken * 1_000_000;
  if (!Number.isFinite(per1M) || per1M === 0) return "free";
  if (per1M < 0.01) return `$${per1M.toFixed(4)}`;
  return `$${per1M.toFixed(2)}`;
}

function keyOf(o: { providerID: string; modelID: string }): string {
  return `${o.providerID}::${o.modelID}`;
}

function groupByProvider(options: ModelOption[]): Array<{
  providerID: string;
  providerName: string;
  options: ModelOption[];
}> {
  const groups = new Map<
    string,
    { providerID: string; providerName: string; options: ModelOption[] }
  >();
  for (const o of options) {
    let g = groups.get(o.providerID);
    if (!g) {
      g = { providerID: o.providerID, providerName: o.providerName, options: [] };
      groups.set(o.providerID, g);
    }
    g.options.push(o);
  }
  return [...groups.values()];
}

export function ModelPicker() {
  const status = useModelsStore((s) => s.status);
  const options = useModelsStore((s) => s.options);
  const selectedProviderID = useModelsStore((s) => s.selectedProviderID);
  const selectedModelID = useModelsStore((s) => s.selectedModelID);
  const load = useModelsStore((s) => s.load);
  const select = useModelsStore((s) => s.select);

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  const groups = useMemo(() => groupByProvider(options), [options]);

  const selectedKey: Key | null =
    selectedProviderID && selectedModelID
      ? keyOf({ providerID: selectedProviderID, modelID: selectedModelID })
      : null;

  const selectedOption = useMemo(
    () =>
      options.find(
        (o) => o.providerID === selectedProviderID && o.modelID === selectedModelID,
      ) ?? null,
    [options, selectedProviderID, selectedModelID],
  );

  const handleSelection = (key: Key | null) => {
    if (key == null) return;
    const [providerID, modelID] = String(key).split("::");
    if (providerID && modelID) select(providerID, modelID);
  };

  return (
    <Autocomplete
      aria-label="选择模型"
      className="max-w-[260px]"
      selectedKey={selectedKey}
      onSelectionChange={handleSelection}
      isDisabled={status === "loading"}
    >
      <Autocomplete.Trigger>
        <Cpu className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <Autocomplete.Value>
          {() => {
            if (status === "loading") {
              return (
                <span className="flex items-center gap-1.5 text-xs text-default-500">
                  <Spinner size="sm" />
                  加载模型中…
                </span>
              );
            }
            if (!selectedOption) {
              return <span className="text-xs text-default-500">选择模型</span>;
            }
            return (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-medium">{selectedOption.modelName}</span>
                <span className="truncate text-[10px] text-default-500">
                  {selectedOption.providerName}
                </span>
              </span>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>

      <Autocomplete.Popover>
        <Autocomplete.Filter>
          <SearchField aria-label="搜索模型">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="搜索模型 / provider…" />
            </SearchField.Group>
          </SearchField>

          <ListBox
            className="max-h-72 overflow-y-auto"
            renderEmptyState={() => (
              <EmptyState className="px-3 py-4 text-center text-xs text-default-500">
                无匹配模型
              </EmptyState>
            )}
          >
            {groups.map((group) => (
              <ListBox.Section key={group.providerID} id={group.providerID}>
                <Header className="px-2 py-1 text-[10px] uppercase tracking-wide text-default-500">
                  {group.providerName}
                </Header>
                {group.options.map((o) => (
                  <ListBox.Item
                    key={keyOf(o)}
                    id={keyOf(o)}
                    textValue={`${o.providerName} ${o.modelName} ${o.modelID}`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-1.5">
                        <Label className="truncate font-medium">{o.modelName}</Label>
                        {o.isDefault && (
                          <span className="shrink-0 rounded bg-primary-500/20 px-1 text-[9px] uppercase tracking-wide text-primary-600">
                            default
                          </span>
                        )}
                        {o.status !== "active" && (
                          <span className="shrink-0 rounded bg-default-100 px-1 text-[9px] uppercase tracking-wide text-default-600">
                            {o.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-default-500">
                        <span>ctx {formatContext(o.contextLimit)}</span>
                        <span>·</span>
                        <span>
                          in {formatCost(o.costInput)} / out {formatCost(o.costOutput)} per 1M
                        </span>
                      </div>
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

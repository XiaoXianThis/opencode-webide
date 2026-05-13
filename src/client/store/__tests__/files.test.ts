import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { FileNode, File as VcsFile } from "@opencode-ai/sdk/client";

const listFn = mock(async (_args: { query: { path: string } }) => ({ data: [] as FileNode[] }));
const statusFn = mock(async () => ({ data: [] as VcsFile[] }));

mock.module("@/lib/opencode", () => ({ oc: { file: { list: listFn, status: statusFn } } }));

const { useFilesStore } = await import("../files");

function node(path: string, type: "file" | "directory"): FileNode {
  return { name: path.split("/").at(-1) ?? path, path, absolute: `/repo/${path}`, type, ignored: false };
}

beforeEach(() => {
  listFn.mockClear();
  statusFn.mockClear();
  listFn.mockImplementation(async () => ({ data: [] }));
  statusFn.mockImplementation(async () => ({ data: [] }));
  useFilesStore.setState({ nodesByPath: {}, expanded: new Set(), statusByPath: {}, loading: {}, status: "idle", error: null });
});

describe("files store", () => {
  it("expand(path) loads children with oc.file.list and stores sorted nodes", async () => {
    listFn.mockImplementation(async () => ({ data: [node("src/b.ts", "file"), node("src/app", "directory"), node("src/a.ts", "file")] }));
    await useFilesStore.getState().expand("src");
    expect(listFn).toHaveBeenCalledWith({ query: { path: "src" } });
    expect(useFilesStore.getState().expanded.has("src")).toBe(true);
    expect(useFilesStore.getState().nodesByPath.src?.map((x) => x.path)).toEqual(["src/app", "src/a.ts", "src/b.ts"]);
  });

  it("refresh(path) reloads an already cached directory", async () => {
    listFn.mockImplementationOnce(async () => ({ data: [node("src/a.ts", "file")] })).mockImplementationOnce(async () => ({ data: [node("src/b.ts", "file")] }));
    await useFilesStore.getState().refresh("src");
    await useFilesStore.getState().refresh("src");
    expect(useFilesStore.getState().nodesByPath.src?.map((x) => x.path)).toEqual(["src/b.ts"]);
  });

  it("refreshStatus maps /file/status results by path", async () => {
    statusFn.mockImplementation(async () => ({ data: [{ path: "src/a.ts", status: "modified", added: 1, removed: 0 }] }));
    await useFilesStore.getState().refreshStatus();
    expect(useFilesStore.getState().statusByPath["src/a.ts"]).toBe("modified");
  });
});

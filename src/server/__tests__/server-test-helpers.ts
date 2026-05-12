export function spawnServerTest(script: string): Bun.Subprocess<"pipe", "pipe", "pipe"> {
  return Bun.spawn({
    cmd: [process.execPath, "--eval", script],
    cwd: process.cwd(),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });
}

export async function expectServerTestPasses(script: string): Promise<void> {
  const proc = spawnServerTest(script);
  proc.stdin.end();
  const [stdout, stderr, exitCode] = await Promise.all([
    Bun.readableStreamToText(proc.stdout),
    Bun.readableStreamToText(proc.stderr),
    proc.exited,
  ]);

  expect(exitCode, stdout + stderr).toBe(0);
}
import { FormEvent, useState } from "react";
import { Button } from "@heroui/react";
import { loginWithToken, redirectAfterLogin } from "@/lib/auth";

export function Login() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const ok = await loginWithToken(token);
    setLoading(false);
    if (!ok) {
      setError("Token is incorrect");
      return;
    }
    redirectAfterLogin();
  };

  return (
    <main className="flex h-full w-full items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-large border border-default-200 bg-content1 p-6 shadow-lg">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sign in to opencode WebIDE</h1>
          <p className="mt-1 text-sm text-default-500">Enter the deployment token configured on the server.</p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          WebIDE token
          <input
            autoFocus
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            aria-label="WebIDE token"
            aria-invalid={Boolean(error)}
            className="rounded-medium border border-default-300 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button color="primary" type="submit" isLoading={loading} isDisabled={!token.trim()}>
          Sign in
        </Button>
      </form>
    </main>
  );
}

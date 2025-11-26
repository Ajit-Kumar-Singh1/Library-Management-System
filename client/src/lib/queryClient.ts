import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

function buildUrl(queryKey: readonly unknown[]): string {
  const parts: string[] = [];
  const queryParams = new URLSearchParams();
  
  for (let i = 0; i < queryKey.length; i++) {
    const part = queryKey[i];
    
    if (part === null || part === undefined || part === "") {
      continue;
    }
    
    if (typeof part === "object" && !Array.isArray(part)) {
      for (const [key, value] of Object.entries(part as Record<string, unknown>)) {
        if (value !== null && value !== undefined && value !== "") {
          if (Array.isArray(value)) {
            queryParams.set(key, JSON.stringify(value));
          } else {
            queryParams.set(key, String(value));
          }
        }
      }
    } else if (Array.isArray(part)) {
      queryParams.set("items", JSON.stringify(part));
    } else {
      parts.push(String(part));
    }
  }
  
  const url = parts.join("/");
  const queryString = queryParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildUrl(queryKey);
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

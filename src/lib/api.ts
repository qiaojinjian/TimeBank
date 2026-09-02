export class ApiError extends Error {}

async function request<T = any>(path: string, method = "GET", body?: any): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* 空响应 */
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `请求出错了（${res.status}）`);
  }
  return data as T;
}

export const get = <T = any>(p: string) => request<T>(p);
export const post = <T = any>(p: string, body?: any) => request<T>(p, "POST", body ?? {});
export const del = <T = any>(p: string) => request<T>(p, "DELETE");
export const put = <T = any>(p: string, body?: any) => request<T>(p, "PUT", body ?? {});

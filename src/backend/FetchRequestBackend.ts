import RequestBackend, {RequestOperation} from "./RequestBackend";
import {ApiResponse}                      from "../ApiTypes";
import RequestContext                     from "../RequestContext";

let fetch: typeof window.fetch = typeof window === "undefined" ? undefined as any : window.fetch;

class FetchError extends Error {
  response?: Response;
}

export default class FetchRequestBackend implements RequestBackend<Response, Error> {

  constructor(fetchLibrary?: typeof window.fetch) {
    if (fetchLibrary !== undefined) {
      fetch = fetchLibrary;
    }
  }

  async extractResponseFromError(
    error: Error,
  ): Promise<ApiResponse | null | undefined> {
    if ("response" in error) {
      const fetchError = error as FetchError;
      return fetchError.response ? this.convertResponse(fetchError.response) : null;
    }
    return undefined;
  }

  async convertResponse<T>(response: Response): Promise<ApiResponse<T>> {
    return {
      data   : await response.json(),
      status : response.status,
      headers: response.headers as any,
    };
  }

  makeRequest<T>(context: RequestContext): RequestOperation<T> {
    const {computedConfig} = context;

    let path = !context.baseUrl.endsWith("/")
      ? context.baseUrl + "/"
      : context.baseUrl;
    path += context.computedPath.startsWith("/")
      ? context.computedPath.substring(1)
      : context.computedPath;

    const url = new URL(path);
    if (computedConfig.query) {
      const queryKeys = Object.keys(computedConfig.query);
      for (let i = 0; i < queryKeys.length; i++) {
        const key = queryKeys[i];
        url.searchParams.append(
          key,
          computedConfig.query[key]?.toString() || "",
        );
      }
    }

    // abort controller is a newer feature than fetch
    const abortController = AbortController && new AbortController();
    const abortSignal = abortController ? abortController.signal : undefined;
    let softAbort = false;
    let responded = false;

    const bodyJsonify = computedConfig.body !== null && typeof computedConfig.body === "object";

    const headers = Object.assign({
      // logic from axios
      "Content-Type": bodyJsonify ? "application/json;charset=utf-8" : "application/x-www-form-urlencoded",
    }, computedConfig.headers);

    const promise: Promise<ApiResponse<T>> = fetch(url.href, {
      method : context.method,
      body   : bodyJsonify ? JSON.stringify(computedConfig.body) : computedConfig.body as any,
      headers: headers,
      mode   : "cors",
      signal : abortSignal,
    }).then((response) => {
      responded = true;
      if (!response.ok) {
        const error = new FetchError("Fetch failed");
        error.response = response;
        throw error;
      }
      if (softAbort) {
        throw new Error("Request was aborted");
      }
      return this.convertResponse(response);
    });
    return {
      promise : promise,
      canceler: abortSignal
        ? () => !responded && abortController.abort()
        : () => {
          console.warn("Request aborted");
          softAbort = true;
        },
    };
  }
}
import RequestContext from "./RequestContext";
import {Api}          from "./Api";

export type ModulePossiblyDefault<T> = T & {
  default?: T;
};

export type Headers = Record<string, string | number | boolean | null | undefined>;

export type Params = string;
export type Query = Record<string,
  string | number | boolean | undefined | null>;
export type Body = string | number | Record<string, any>;

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface BaseRequestConfig {
  options?: RequestConfigOptions;
  headers?: Readonly<Headers>;
}

export type RequestConfig<P extends Params | undefined = Params,
  Q extends Query | undefined = Query,
  B extends Body | undefined = Body> = (P extends undefined
  ? { params?: never }
  : { params: Record<P extends Params ? P : never, string> }) &
  (Q extends undefined ? { query?: never } : { query: Q }) &
  (B extends undefined ? { body?: never } : { body: B }) &
  BaseRequestConfig;

export interface RequestConfigOptions {
  cache?: number | boolean;
  lock?: string | false;
  retries?: number;
}

export enum RequestMethod {
  Post = "post",
  Get  = "get",
}

export enum RequestEvent {
  BeforeSend         = "beforeSend",
  Success            = "success",
  Error              = "error",
  UnrecoverableError = "unrecoverableError",
}

export enum EventResultType {
  Respond = "respond",
  Retry   = "retry",
}

interface BaseEventResult<T extends EventResultType> {
  type: T;
}

export type ResponseEventResult<R> = BaseEventResult<EventResultType.Respond> & {
  response: ApiResponse<R>;
};

export type RetryEventResult<R> = BaseEventResult<EventResultType.Retry>;

export type EventResult<R> = ResponseEventResult<R> | RetryEventResult<R>;

export type RequestEventHandler<R> = (
  context: RequestContext<R>,
) => EventResult<R> | void | Promise<EventResult<R> | void>;

export type RequestEventHandlers<R> = {
  [key in RequestEvent]?: Array<RequestEventHandler<R>>;
};

export type RequestMiddleware<O = undefined> = {
  [key in RequestEvent]?: RequestEventHandler<any> | undefined | false;
};

export interface RequestContextStats {
  cached: false | { is: true; by: "local" | "api" };
  attempt: number;
}

export interface RequestError extends Error {
  name: "RequestError";
  response?: ApiResponse;
}

export type RequestCanceler = () => boolean;

export interface RequestHost {
  readonly method: RequestMethod;
  readonly api: Api;
  readonly baseUrl: string;
  readonly path: string;
  readonly responseType: ResponseType;

  computeConfig<P extends Params | undefined,
    Q extends Query | undefined,
    B extends Body | undefined>(
    config: RequestConfig<P, Q, B>,
  ): RequestConfig<P, Q, B>;

  computePath(path: string, config: RequestConfig): string;
}

export interface CancelledRequestError extends Error {
  isCancelledRequest: true;
}

export enum CacheSource {
  Api   = "api",
  Local = "local",
}

export interface RequestCacheInfo {
  cached: boolean;
  source: CacheSource | null;
}

export enum ResponseType {
  Json        = "json",
  Text        = "text",
  ArrayBuffer = "arraybuffer",
}

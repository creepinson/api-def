import RequestBackend, {RequestOperation} from "./RequestBackend";
import {ApiResponse} from "../ApiTypes";
import axios, {AxiosError, AxiosResponse} from "axios";
import RequestContext from "../RequestContext";

export const isAxiosError = (error: Error): error is AxiosError => {
    return "isAxiosError" in error;
};

export default class AxiosBackend
    implements RequestBackend<AxiosResponse, AxiosError> {
    async extractResponseFromError(
        error: Error,
    ): Promise<ApiResponse | null | undefined> {
        if (isAxiosError(error)) {
            return error.response ? await this.convertResponse(error.response) : null;
        }
        return undefined;
    }

    async convertResponse<T>(response: AxiosResponse): Promise<ApiResponse<T>> {
        return response;
    }

    makeRequest<T>(context: RequestContext): RequestOperation<T> {
        const {computedConfig} = context;

        let canceler: (() => void) | null = null;
        const promise: Promise<ApiResponse<T>> = axios({
            method: context.method,
            baseURL: context.baseUrl,
            url: context.computedPath,
            data: computedConfig.body || {},
            params: computedConfig.query || {},
            headers: computedConfig.headers || {},
            responseType: context.responseType,
            cancelToken: new axios.CancelToken((cancellerFunc) => {
                canceler = cancellerFunc;
            }),
        }).then((response) => this.convertResponse(response));
        return {
            promise: promise,
            canceler: () => canceler && canceler(),
        };
    }
}
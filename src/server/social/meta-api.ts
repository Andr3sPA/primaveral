import "server-only";

import type { PublicationPayload } from "@/server/social/publishing";
import {
  createInstagramJpegUrl,
  createPublicationCaption,
  requirePublicHttpsImageUrl,
} from "@/server/social/publishing";

type MetaConfig = {
  pageId: string;
  instagramUserId?: string;
  accessToken: string;
  graphApiVersion: string;
};

type MetaResponse = {
  id?: string;
  post_id?: string;
  status_code?: string;
  status?: string;
  error?: {
    code?: string | number;
    is_transient?: boolean;
  };
};

export class MetaApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null,
    readonly safeToRetry: boolean,
    readonly outcomeUnknown: boolean,
    readonly retryAfterMs = 0,
  ) {
    super("La solicitud a Meta no se completó.");
    this.name = "MetaApiError";
  }
}

function getRetryAfterMs(response: Response) {
  const value = response.headers.get("retry-after");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : Math.max(0, timestamp - Date.now());
}

export function createMetaPublisher(
  config: MetaConfig,
  fetcher: typeof fetch = fetch,
) {
  async function request(
    method: "GET" | "POST",
    endpoint: string,
    params: URLSearchParams,
  ): Promise<MetaResponse> {
    let response: Response;
    const url = new URL(
      `https://graph.facebook.com/${config.graphApiVersion}/${endpoint}`,
    );
    if (method === "GET") {
      params.forEach((value, key) => url.searchParams.set(key, value));
    }
    try {
      response = await fetcher(url, {
        method,
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          ...(method === "POST"
            ? { "Content-Type": "application/x-www-form-urlencoded" }
            : {}),
        },
        ...(method === "POST" ? { body: params } : {}),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new MetaApiError(
        "NETWORK_ERROR",
        null,
        method === "GET",
        method === "POST",
      );
    }

    const responseData = (await response
      .json()
      .catch(() => null)) as MetaResponse | null;
    const metaError = responseData?.error;
    if (!response.ok || metaError) {
      const status = response.status;
      const metaCode = metaError?.code;
      const safeMetaCode =
        (typeof metaCode === "number" &&
          Number.isInteger(metaCode) &&
          metaCode >= 0 &&
          metaCode <= 99_999_999) ||
        (typeof metaCode === "string" && /^\d{1,8}$/.test(metaCode))
          ? String(metaCode)
          : null;
      const rateLimitError =
        metaError?.is_transient === true &&
        ["4", "17", "32", "613"].includes(safeMetaCode ?? "");
      throw new MetaApiError(
        safeMetaCode ? `META_${safeMetaCode}` : `HTTP_${status}`,
        status,
        status === 429 ||
          (method === "GET" && status >= 500) ||
          (status < 500 && rateLimitError),
        method === "POST" && status >= 500,
        getRetryAfterMs(response),
      );
    }
    if (!responseData) {
      throw new MetaApiError(
        "INVALID_RESPONSE",
        response.status,
        false,
        method === "POST",
      );
    }
    return responseData;
  }

  return {
    async publishFacebook(payload: PublicationPayload) {
      const endpoint = payload.imageUrl
        ? `${encodeURIComponent(config.pageId)}/photos`
        : `${encodeURIComponent(config.pageId)}/feed`;
      const params = new URLSearchParams({
        [payload.imageUrl ? "caption" : "message"]:
          createPublicationCaption(payload),
      });
      if (payload.imageUrl) {
        params.set("url", requirePublicHttpsImageUrl(payload.imageUrl));
      }

      const response = await request("POST", endpoint, params);
      const id = response.post_id ?? response.id;
      if (!id) {
        throw new MetaApiError("MISSING_POST_ID", 200, false, true);
      }
      return id;
    },

    async createInstagramContainer(payload: PublicationPayload) {
      if (!config.instagramUserId) {
        throw new MetaApiError("META_NOT_CONFIGURED", null, false, false);
      }
      const params = new URLSearchParams({
        image_url: createInstagramJpegUrl(payload.imageUrl),
        caption: createPublicationCaption(payload),
      });
      const response = await request(
        "POST",
        `${encodeURIComponent(config.instagramUserId)}/media`,
        params,
      );
      if (!response.id) {
        throw new MetaApiError("MISSING_CONTAINER_ID", 200, false, false);
      }
      return response.id;
    },

    async getInstagramContainerStatus(containerId: string) {
      const params = new URLSearchParams({ fields: "status_code,status" });
      return request("GET", `${encodeURIComponent(containerId)}`, params);
    },

    async publishInstagramContainer(containerId: string) {
      if (!config.instagramUserId) {
        throw new MetaApiError("META_NOT_CONFIGURED", null, false, false);
      }
      const params = new URLSearchParams({ creation_id: containerId });
      const response = await request(
        "POST",
        `${encodeURIComponent(config.instagramUserId)}/media_publish`,
        params,
      );
      if (!response.id) {
        throw new MetaApiError("MISSING_POST_ID", 200, false, true);
      }
      return response.id;
    },
  };
}

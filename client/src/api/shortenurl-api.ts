import api from "./axios";

export interface ShortUrlResponse {
  long_url: string;
  short_code: string;
  short_url: string;
}

export const createShortUrl = async (url: string) => {
  const response = await api.post<ShortUrlResponse>("/urls", {
    url: url,
  });

  return response.data;
};

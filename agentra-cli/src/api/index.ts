import axios, { AxiosInstance } from 'axios';
import { readConfig } from '../config';

export function getApiClient(): AxiosInstance {
  const config = readConfig();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  return axios.create({
    baseURL: config.backendUrl,
    headers,
    timeout: 10000
  });
}

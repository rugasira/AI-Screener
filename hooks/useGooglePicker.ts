import { useState, useCallback } from 'react';
import { toast } from 'sonner';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export function useGooglePicker() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const loadScripts = useCallback(() => {
    if (isLoaded) return;

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('client:picker', () => {
        setIsLoaded(true);
      });
    };
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    document.body.appendChild(gisScript);
  }, [isLoaded]);

  const getAccessToken = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error !== undefined) {
            reject(response);
          }
          setAccessToken(response.access_token);
          resolve(response.access_token);
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }, []);

  const openPicker = useCallback(async (onSelect: (files: any[]) => void) => {
    if (!CLIENT_ID || !API_KEY) {
      toast.error('Google Drive configuration is missing. Please check your environment variables.');
      return;
    }

    try {
      let token = accessToken;
      if (!token) {
        token = await getAccessToken();
      }

      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
      view.setMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword');

      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setAppId(import.meta.env.VITE_GOOGLE_APP_ID || '')
        .setOAuthToken(token)
        .addView(view)
        .setDeveloperKey(API_KEY)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            onSelect(data.docs);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening picker:', error);
    }
  }, [accessToken, getAccessToken]);

  return { loadScripts, openPicker, isLoaded, accessToken };
}

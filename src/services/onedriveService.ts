/**
 * Microsoft Graph API Service (OneDrive)
 * Used to upload finished designs to a shared OneDrive folder.
 */

export const onedriveService = {
  /**
   * Uploads a file to a specific folder in OneDrive
   * Requires a valid Microsoft Access Token (obtained via OAuth)
   */
  async uploadDesign(accessToken: string, fileName: string, blob: Blob): Promise<any> {
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/Opul_Designs/${fileName}:/content`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': blob.type,
        },
        body: blob,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload to OneDrive');
      }

      return await response.json();
    } catch (error) {
      console.error('OneDrive Upload Error:', error);
      throw error;
    }
  },

  /**
   * Generates the Microsoft OAuth URL for the user to connect their account
   */
  getAuthUrl(): string {
    const clientId = (import.meta as any).env.VITE_MICROSOFT_CLIENT_ID;
    const redirectUri = encodeURIComponent((import.meta as any).env.VITE_MICROSOFT_REDIRECT_URI);
    const scopes = encodeURIComponent('files.readwrite offline_access');
    
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`;
  }
};

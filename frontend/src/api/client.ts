import ky from 'ky'

// api is the configured ky HTTP client instance for all API requests.
// It sets the base URL prefix and includes credentials for session cookies.
export const api = ky.create({
  prefixUrl: '/api',
  credentials: 'include',
  hooks: {
    beforeError: [
      async (error) => {
        const { response } = error
        if (response) {
          try {
            const body = await response.json() as { error?: string }
            if (body.error) {
              error.message = body.error
            }
          } catch {
            // Response was not JSON, keep original error
          }
        }
        return error
      },
    ],
  },
})

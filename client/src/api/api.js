import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const API = axios.create({
  baseURL: "http://localhost:8090/api",
  withCredentials: true, // Ensures cookies are sent with requests
});

// Axios Response Interceptor: Auto-refresh token if 401 Unauthorized
API.interceptors.response.use(
  (response) => response, // Return response if successful
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log("Access token expired. Attempting refresh...");

      try {
        // Request a new access token using refresh token (sent via HTTP-only cookie)
        await axios.post(`http://localhost:8090/api/auth/access-token`, null, {
          withCredentials: true, // Send HTTP-only cookies
        });

        // Retry the failed request after refreshing token
        return API(error.config);
      } catch (refreshError) {
        console.error(
          "Refresh token expired or invalid. Redirecting to login."
        );
        window.location.href = "/login"; // Redirect user to login page
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const API_BASE_URL = typeof process.env.REACT_APP_API_BASE_URL === "string"
  ? process.env.REACT_APP_API_BASE_URL
  : "http://localhost:8080";
const API_PREFIX = `${API_BASE_URL}/api`;
const IMAGES_BASE_URL = `${API_BASE_URL}/images`;

export { API_BASE_URL, API_PREFIX, IMAGES_BASE_URL };

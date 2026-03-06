import axios from 'axios';

export const API_BASE = '/api';

const apiClient = axios.create({
    baseURL: API_BASE,
});

export default apiClient;

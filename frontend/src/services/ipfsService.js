import axios from 'axios';

const PINATA_API_URL = 'https://api.pinata.cloud';

const API_KEY    = import.meta.env.VITE_PINATA_API_KEY;
const SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

export const ipfsService = {

  async uploadFile(file) {
    if (!API_KEY || !SECRET_KEY) {
      console.warn('Pinata keys not set — using mock hash');
      return this.mockUpload(file);
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pinataMetadata', JSON.stringify({ name: `EqualFund-${Date.now()}` }));
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'Content-Type':        'multipart/form-data',
            pinata_api_key:        API_KEY,
            pinata_secret_api_key: SECRET_KEY,
          },
          maxBodyLength: Infinity,
        }
      );
      console.log('✅ Uploaded to IPFS:', response.data.IpfsHash);
      return response.data.IpfsHash;
    } catch (e) {
      console.error('Pinata upload failed:', e.message);
      return this.mockUpload(file);
    }
  },

  async uploadJSON(data) {
    if (!API_KEY || !SECRET_KEY) return 'QmMockJSON' + Date.now();
    try {
      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
        {
          pinataContent:  data,
          pinataMetadata: { name: `EqualFund-Data-${Date.now()}` },
        },
        {
          headers: {
            'Content-Type':        'application/json',
            pinata_api_key:        API_KEY,
            pinata_secret_api_key: SECRET_KEY,
          },
        }
      );
      return response.data.IpfsHash;
    } catch (e) {
      console.error('Pinata JSON upload failed:', e.message);
      return 'QmMockJSON' + Date.now();
    }
  },

  getIPFSUrl(hash) {
    if (!hash || hash.startsWith('QmMock')) return null;
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  },

  async mockUpload(file) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockHash = 'QmMock' + Math.random().toString(36).substr(2, 44);
        resolve(mockHash);
      }, 800);
    });
  },

  isPinataConfigured() {
    return !!(API_KEY && SECRET_KEY);
  },
};
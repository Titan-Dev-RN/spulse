module.exports = {
  // NFC configuration
  nfc: {
    // Timeout for NFC operations (in milliseconds)
    timeout: 5000,
    
    // Supported NFC tag types
    supportedTypes: ['NDEF', 'MIFARE', 'NTAG'],
    
    // Maximum data size for writing (in bytes)
    maxWriteSize: 1024
  },
  
  // Security settings
  security: {
    // Require authentication for NFC operations
    requireAuth: true,
    
    // Encryption key for sensitive NFC data
    encryptionKey: process.env.NFC_ENCRYPTION_KEY || 'default-encryption-key'
  }
};
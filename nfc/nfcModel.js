const nfcModel = require('../models/nfcModel');
const nfcUtils = require('../utils/nfcUtils');

exports.processNfcTag = async (tagId) => {
  // Validate tag
  if (!nfcUtils.validateTagId(tagId)) {
    throw new Error('Invalid NFC tag ID');
  }
  
  // Check if tag exists in database
  const tagData = await nfcModel.getTagData(tagId);
  
  if (!tagData) {
    throw new Error('NFC tag not registered');
  }
  
  return tagData;
};

exports.writeToNfcTag = async (tagId, data) => {
  // Validate data
  if (!nfcUtils.validateNfcData(data)) {
    throw new Error('Invalid data format for NFC tag');
  }
  
  // Save to database
  const result = await nfcModel.saveTagData(tagId, data);
  
  return {
    success: true,
    message: 'Data written to NFC tag successfully',
    data: result
  };
};
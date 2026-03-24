// src/utils/identity.js

export const getOrGenerateDID = () => {
  const STORAGE_KEY = 'patient_did';
  let did = localStorage.getItem(STORAGE_KEY);
  if (!did) {
    const randomString = Math.random().toString(36).substring(2, 10);
    did = `did:key:z6Mk${randomString}`; 
    localStorage.setItem(STORAGE_KEY, did);
  }
  return did;
};

export const saveCredential = (credential) => {
  const STORAGE_KEY = 'my_credentials';
  const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const exists = current.find(c => c.vc.proof?.jwt === credential.vc.proof?.jwt);
  
  if (!exists) {
    current.push(credential);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return true; 
  }
  return false; 
};

export const getCredentials = () => {
  return JSON.parse(localStorage.getItem('my_credentials') || '[]');
};

export const saveAllCredentials = (credsArray) => {
  localStorage.setItem('my_credentials', JSON.stringify(credsArray));
};
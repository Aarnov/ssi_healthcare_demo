// pharmacy-server/veramo/setup.js
const { createAgent } = require('@veramo/core');
const { CredentialPlugin } = require('@veramo/credential-w3c');
const { DIDResolverPlugin } = require('@veramo/did-resolver');
const { Resolver } = require('did-resolver');
const { getResolver: getWebResolver } = require('web-did-resolver');
const { getResolver: getKeyResolver } = require('key-did-resolver');

// Configure the DID resolvers (so the pharmacy knows how to read did:web and did:key)
const didResolver = new Resolver({
  ...getWebResolver(),
  ...getKeyResolver()
});

// Create the highly stripped-down "Verifier Only" Agent
const agent = createAgent({
  plugins: [
    new DIDResolverPlugin({ resolver: didResolver }),
    new CredentialPlugin()
  ],
});

module.exports = { agent };
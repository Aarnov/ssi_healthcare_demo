import { createAgent } from '@veramo/core'
import { DIDManager } from '@veramo/did-manager'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { KeyManager } from '@veramo/key-manager'
import { KeyManagementSystem } from '@veramo/kms-local'
import { KeyDIDProvider } from '@veramo/did-provider-key'
import { CredentialPlugin } from '@veramo/credential-w3c'
import { Resolver } from 'did-resolver'
import { getResolver as getKeyResolver } from 'key-did-resolver'

// NEW IMPORTS FOR DATABASE
import { DataSource } from 'typeorm'
import { Entities, KeyStore, DIDStore, PrivateKeyStore, DataStore, DataStoreORM } from '@veramo/data-store'

// 1. Setup the Database File
const dbConnection = new DataSource({
  type: 'sqlite',
  database: 'database.sqlite', // This file will appear in your folder
  synchronize: true,
  logging: false,
  entities: Entities,
}).initialize()

export const agent = createAgent({
  plugins: [
    // 2. Use the Database instead of Memory
    new KeyManager({
      store: new KeyStore(dbConnection),
      kms: {
        local: new KeyManagementSystem(new PrivateKeyStore(dbConnection)),
      },
    }),
    new DIDManager({
      store: new DIDStore(dbConnection),
      defaultProvider: 'did:key',
      providers: {
        'did:key': new KeyDIDProvider({ defaultKms: 'local' }),
      },
    }),
    new DIDResolverPlugin({
      resolver: new Resolver({ ...getKeyResolver() }),
    }),
    new CredentialPlugin(),
    new DataStore(dbConnection),
    new DataStoreORM(dbConnection),
  ],
})
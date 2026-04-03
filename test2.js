import * as StellarSdk from '@stellar/stellar-sdk';
const asset = StellarSdk.Asset.native();
console.log('Contract ID for Native XLM is:', asset.contractId('Test SDF Network ; September 2015'));

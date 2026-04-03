import * as StellarSdk from '@stellar/stellar-sdk';
const addr = 'CAS3J7AVUOS3MTODCD3573MEXUMZ3GACZHHZ2S37OOBY2V6YV34CO3S4';
try {
  console.log('Testing nativeToScVal with Address object...');
  const addrObj = new StellarSdk.Address(addr);
  const val = StellarSdk.nativeToScVal(addrObj, {type: 'address'});
  console.log('Success!', val);
} catch (e) {
  console.error('It failed with Address obj:', e.message);
}

try {
  console.log('Testing nativeToScVal with string...');
  const val = StellarSdk.nativeToScVal(addr, { type: 'address' });
  console.log('Success!', val);
} catch (e) {
  console.error('It failed with string:', e.message);
}


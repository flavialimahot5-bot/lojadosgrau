import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentValidationFields} from '../lib/payments.js';

test('price errors retain the rejected item and validation rule without raw data',()=>{
 assert.deepEqual(paymentValidationFields({
  'cart.0.price':['The cart.0.price must be an integer.'],
  'cart.2.price':['The cart.2.price must be at least 100.'],
  amount:['The amount must match the offer.'],
  'customer.document':['PRIVATE DOCUMENT'],
  'secret.api_token':['PRIVATE TOKEN'],
 }),['preço do item 1: exige número inteiro','preço do item 3: abaixo do mínimo permitido','valor: valor divergente','CPF']);
 assert.deepEqual(paymentValidationFields({'cart.1.price':['PRIVATE TOKEN, CPF, email']}),['preço do item 2']);
 assert.deepEqual(paymentValidationFields(null),[]);
 assert.deepEqual(paymentValidationFields(['unexpected']),[]);
 assert.deepEqual(paymentValidationFields({'cart.0.price':'O preço deve ser numérico.'}),['preço do item 1: exige valor numérico']);
 assert.deepEqual(paymentValidationFields({'cart.0.price':'The price must be at most 50000.'}),['preço do item 1: acima do máximo permitido']);
});

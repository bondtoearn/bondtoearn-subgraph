import { Address, BigDecimal } from '@graphprotocol/graph-ts'

import {  BondCreated, BondRedeemed } from '../generated/DAIBondV3/DAIBondV3'
import { Deposit, Redemption } from '../generated/schema'
import { loadOrCreateTransaction } from "./utils/Transactions"
import { loadOrCreateOHMie, updateOhmieBalance } from "./utils/OHMie"
import { toDecimal } from "./utils/Decimals"
import { DAIBOND_TOKEN } from './utils/Constants'
import { loadOrCreateToken } from './utils/Tokens'
import { loadOrCreateRedemption } from './utils/Redemption'
import { createDailyBondRecord } from './utils/DailyBond'


export function handleDeposit(event: BondCreated): void {
  let tx = event.transaction
  let ohmie = loadOrCreateOHMie(tx.from)
  let transaction = loadOrCreateTransaction(tx, event.block)
  let token = loadOrCreateToken(DAIBOND_TOKEN)

  let amount = toDecimal(event.params.deposit, 18)
  let deposit = new Deposit(transaction.id)
  deposit.transaction = transaction.id
  deposit.ohmie = ohmie.id
  deposit.amount = amount
  deposit.value = amount
  deposit.maxPremium = BigDecimal.fromString("0")
  deposit.token = token.id;
  deposit.timestamp = transaction.timestamp;
  deposit.save()

  createDailyBondRecord(deposit.timestamp, token, deposit.amount, deposit.value)
  updateOhmieBalance(ohmie, transaction)
}

export function handleRedeem(event: BondRedeemed): void {
  let tx = event.transaction

  let ohmie = loadOrCreateOHMie(tx.from)
  let transaction = loadOrCreateTransaction(tx, event.block)
  
  let redemption = loadOrCreateRedemption(tx.hash as Address)
  redemption.transaction = transaction.id
  redemption.ohmie = ohmie.id
  redemption.token = loadOrCreateToken(DAIBOND_TOKEN).id;
  redemption.timestamp = transaction.timestamp;
  redemption.save()
  updateOhmieBalance(ohmie, transaction)
}
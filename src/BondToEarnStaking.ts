import { Address } from '@graphprotocol/graph-ts'
import { Stake, Unstake } from '../generated/schema'

import {  LogStake, LogUnstake, StakeCall, UnstakeCall  } from '../generated/OlympusStakingV2/OlympusStakingV2'
import { toDecimal } from "./utils/Decimals"
import { loadOrCreateOHMie, updateOhmieBalance } from "./utils/OHMie"
import { loadOrCreateTransaction } from "./utils/Transactions"
import { updateProtocolMetrics } from './utils/ProtocolMetrics'

export function handleStake(event: LogStake): void {
    let ohmie = loadOrCreateOHMie(event.transaction.from as Address)
    let transaction = loadOrCreateTransaction(event.transaction, event.block)
    let value = toDecimal(event.params.amount, 9)

    let stake = new Stake(transaction.id)
    stake.transaction = transaction.id
    stake.ohmie = ohmie.id
    stake.amount = value
    stake.timestamp = transaction.timestamp;
    stake.save()

    updateOhmieBalance(ohmie, transaction)
    updateProtocolMetrics(transaction)
}

export function handleUnstake(event: LogUnstake): void {
    let ohmie = loadOrCreateOHMie(event.transaction.from as Address)
    let transaction = loadOrCreateTransaction(event.transaction, event.block)
    let value = toDecimal(event.params.amount, 9)

    let unstake = new Unstake(transaction.id)
    unstake.transaction = transaction.id
    unstake.ohmie = ohmie.id
    unstake.amount = value
    unstake.timestamp = transaction.timestamp;
    unstake.save()

    updateOhmieBalance(ohmie, transaction)
    updateProtocolMetrics(transaction)
}
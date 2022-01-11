import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { Ohmie, Transaction } from '../../generated/schema'
import { OlympusERC20 } from '../../generated/sOlympusERC20V2/OlympusERC20'
import { sOlympusERC20V2 } from '../../generated/sOlympusERC20V2/sOlympusERC20V2'
import { DAIBondV3 } from '../../generated/DAIBondV3/DAIBondV3'
import { OHMDAIBondV4 } from '../../generated/OHMDAIBondV4/OHMDAIBondV4'

import { DAIBOND_CONTRACTS3, DAIBOND_CONTRACTS3_BLOCK, DAIBOND_CONTRACTS3_V2, DAIBOND_CONTRACTS3_V2_BLOCK, OHMDAISLPBOND_CONTRACT4, OHMDAISLPBOND_CONTRACT4_BLOCK, OHMDAISLPBOND_CONTRACT_V2, OHMDAISLPBOND_CONTRACT_V2_BLOCK, OHM_ERC20_CONTRACT, SOHM_ERC20_CONTRACTV2, SOHM_ERC20_CONTRACTV2_BLOCK } from '../utils/Constants'
import { loadOrCreateOhmieBalance } from './OhmieBalances'
import { toDecimal } from './Decimals'
import { getOHMUSDRate } from './Price'
import { loadOrCreateContractInfo } from './ContractInfo'
import { getHolderAux } from './Aux'

export function loadOrCreateOHMie(addres: Address): Ohmie {
    let ohmie = Ohmie.load(addres.toHex())
    if (ohmie == null) {
        let holders = getHolderAux()
        holders.value = holders.value.plus(BigInt.fromI32(1))
        holders.save()

        ohmie = new Ohmie(addres.toHex())
        ohmie.active = true
        ohmie.save()
    }
    return ohmie as Ohmie
}

export function updateOhmieBalance(ohmie: Ohmie, transaction: Transaction): void {

    let balance = loadOrCreateOhmieBalance(ohmie, transaction.timestamp)

    let ohm_contract = OlympusERC20.bind(Address.fromString(OHM_ERC20_CONTRACT))
    // let sohm_contract = sOlympusERC20.bind(Address.fromString(SOHM_ERC20_CONTRACT))
    balance.ohmBalance = toDecimal(ohm_contract.balanceOf(Address.fromString(ohmie.id)), 9)
    // let sohmV1Balance = toDecimal(sohm_contract.balanceOf(Address.fromString(ohmie.id)), 9)
    // balance.sohmBalance = sohmV1Balance

    let stakes = balance.stakes

    // let cinfoSohmBalance_v1 = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "sOlympusERC20")
    // cinfoSohmBalance_v1.name = "sOHM"
    // cinfoSohmBalance_v1.contract = SOHM_ERC20_CONTRACT
    // cinfoSohmBalance_v1.amount = sohmV1Balance
    // cinfoSohmBalance_v1.save()
    // stakes.push(cinfoSohmBalance_v1.id)

    if (transaction.blockNumber.gt(BigInt.fromString(SOHM_ERC20_CONTRACTV2_BLOCK))) {
        let sohm_contract_v2 = sOlympusERC20V2.bind(Address.fromString(SOHM_ERC20_CONTRACTV2))
        let sohmV2Balance = toDecimal(sohm_contract_v2.balanceOf(Address.fromString(ohmie.id)), 9)
        balance.sohmBalance = balance.sohmBalance.plus(sohmV2Balance)

        let cinfoSohmBalance_v2 = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "sOlympusERC20V2")
        cinfoSohmBalance_v2.name = "sOHM"
        cinfoSohmBalance_v2.contract = SOHM_ERC20_CONTRACTV2
        cinfoSohmBalance_v2.amount = sohmV2Balance
        cinfoSohmBalance_v2.save()
        stakes.push(cinfoSohmBalance_v2.id)
    }

    balance.stakes = stakes

    if (ohmie.active && balance.ohmBalance.lt(BigDecimal.fromString("0.01")) && balance.sohmBalance.lt(BigDecimal.fromString("0.01"))) {
        let holders = getHolderAux()
        holders.value = holders.value.minus(BigInt.fromI32(1))
        holders.save()
        ohmie.active = false
    }
    else if (ohmie.active == false && (balance.ohmBalance.gt(BigDecimal.fromString("0.01")) || balance.sohmBalance.gt(BigDecimal.fromString("0.01")))) {
        let holders = getHolderAux()
        holders.value = holders.value.plus(BigInt.fromI32(1))
        holders.save()
        ohmie.active = true
    }

    //OHM-DAI
    let bonds = balance.bonds
    if (transaction.blockNumber.gt(BigInt.fromString(OHMDAISLPBOND_CONTRACT4_BLOCK))) {

        const BOND_CONTRACT = transaction.blockNumber.gt(BigInt.fromString(OHMDAISLPBOND_CONTRACT_V2_BLOCK))
            ? OHMDAISLPBOND_CONTRACT_V2
            : OHMDAISLPBOND_CONTRACT4

        let bondOHMDai_contract = OHMDAIBondV4.bind(Address.fromString(BOND_CONTRACT))
        let pending = bondOHMDai_contract.bondInfo(Address.fromString(ohmie.id))
        if (pending.value1.gt(BigInt.fromString("0"))) {
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "OHMDAIBondV4")
            binfo.name = "OHM-DAI"
            binfo.contract = OHMDAISLPBOND_CONTRACT4
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("Ohmie {} pending OHMDAIBondV4 V1 {} on tx {}", [ohmie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    //DAI
    if (transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS3_BLOCK))) {

        const BOND_CONTRACT = transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS3_V2_BLOCK))
            ? DAIBOND_CONTRACTS3_V2
            : DAIBOND_CONTRACTS3

        let bondDai_contract = DAIBondV3.bind(Address.fromString(BOND_CONTRACT))
        let pending = bondDai_contract.bondInfo(Address.fromString(ohmie.id))
        if (pending.value1.gt(BigInt.fromString("0"))) {
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "DAIBondV3")
            binfo.name = "DAI"
            binfo.contract = DAIBOND_CONTRACTS3
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("Ohmie {} pending DAIBondV3 V1 {} on tx {}", [ohmie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    balance.bonds = bonds

    //TODO add LUSD and OHMLUSD

    //Price
    let usdRate = getOHMUSDRate()
    balance.dollarBalance = balance.ohmBalance.times(usdRate).plus(balance.sohmBalance.times(usdRate)).plus(balance.bondBalance.times(usdRate))
    balance.save()

    ohmie.lastBalance = balance.id;
    ohmie.save()
}
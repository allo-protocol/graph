import { log, ethereum } from "@graphprotocol/graph-ts";
import {
  VaultAddressUpdated as VaultAddressUpdatedEvent,
  PayoutMade as PayoutMadeEvent,
  ApplicationInReview as ApplicationInReviewEvent
} from "../../../generated/templates/DirectPayoutStrategyImplementation/DirectPayoutStrategyImplementation";
import { DirectPayout, Payout, MetaPtr, RoundApplication } from "../../../generated/schema";
import { createStatusSnapshot, generateID, updateMetaPtr } from "../../utils";

const VERSION = "0.1.0";


/**
 * Handles indexing on VaultAddressUpdated event.
 * @param event VaultAddressUpdatedEvent
 */
export function handVaultAddressUpdated(event: VaultAddressUpdatedEvent): void {
  const payoutStrategyAddress = event.address.toHex();
  let payoutStrategy = DirectPayout.load(payoutStrategyAddress);

  if (!payoutStrategy) {
    log.warning("--> handVaultAddressUpdated {} {}: payoutStrategy is null", ["DIRECT", payoutStrategyAddress]);
    return;
  }

  payoutStrategy.vaultAddress = event.params.vaultAddress.toHexString();
  payoutStrategy.save();
}

/**
 * Handles indexing on ApplicationInReview event.
 * @param event ApplicationInReviewEvent
 */
export function handleApplicationInReview(event: ApplicationInReviewEvent): void {
  const payoutStrategyAddress = event.address.toHex();
  let payoutStrategy = DirectPayout.load(payoutStrategyAddress);
  if (!payoutStrategy) {
    log.warning("--> handleApplicationInReview {} {}: payoutStrategy is null", ["DIRECT", payoutStrategyAddress]);
    return;
  }

  const roundApplicationId = [payoutStrategy.roundId, event.params.applicationIndex.toString()].join("-");
  const roundApplication = RoundApplication.load(roundApplicationId);

  if (roundApplication != null) {
    // update status
    roundApplication.status = 5
    roundApplication.statusDescription = "IN REVIEW";
    roundApplication.save();
    if (roundApplication.status != 5) createStatusSnapshot(roundApplication, 5, event);
  }
}

/**
 * Handles indexing on PayoutMade event.
 * @param event PayoutMadeEvent
 */
export function handhandlePayoutMade(event: PayoutMadeEvent): void {
  // load payout strategy contract
  const payoutStrategyAddress = event.address.toHex();
  let payoutStrategy = DirectPayout.load(payoutStrategyAddress);

  if (!payoutStrategy) {
    log.warning("--> handlePayoutMade {} {}: payoutStrategy is null", ["DIRECT", payoutStrategyAddress]);
    return;
  }

  // create Payout entity
  const payoutID = generateID([
    event.transaction.hash.toHex(),
    event.params.projectId.toString()
  ]);

  const payout = new Payout(payoutID);

  payout.payoutStrategy = payoutStrategy.id;
  payout.amount = event.params.amount;
  payout.token = event.params.token.toHex();
  payout.projectId = event.params.projectId.toHexString();
  payout.grantee = event.params.grantAddress.toHex();
  payout.vault = event.params.vault.toHex();
  payout.applicationIndex = event.params.applicationIndex.toI32();
  payout.allowanceModule = event.params.allowanceModule.toHex();
  payout.protocolFee = event.params.protocolFee;
  payout.roundFee = event.params.roundFee;

  payout.txnHash = event.transaction.hash.toHex();

  // set timestamp
  payout.createdAt = event.block.timestamp;

  payout.version = VERSION;

  payout.save();
}

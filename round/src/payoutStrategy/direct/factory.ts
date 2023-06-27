import { PayoutContractCreated as PayoutContractCreatedEvent } from "../../../generated/DirectPayoutStrategyFactory/DirectPayoutStrategyFactory";
import { DirectPayoutStrategyImplementation as DirectPayoutStrategyContract } from "../../../generated/DirectPayoutStrategyFactory/DirectPayoutStrategyImplementation";
import { DirectPayoutStrategyImplementation as PayoutStrategyImplementation } from "../../../generated/templates";

import { getAlloSettings } from "../../utils";
import { DirectPayout } from "../../../generated/schema";
import { log } from "@graphprotocol/graph-ts";

const VERSION = "0.1.0";

/**
 * @dev Handles indexing on PayoutContractCreated event.
 * @param event PayoutContractCreatedEvent
 */
export function handlePayoutContractCreated(event: PayoutContractCreatedEvent): void {
  const payoutStrategyContractAddress = event.params.payoutContractAddress;
  let payoutStrategy = DirectPayout.load(
    payoutStrategyContractAddress.toHex()
  );

  if (payoutStrategy) {
    log.warning("--> handlePayoutContractCreated {} : payoutStrategy already exists", [payoutStrategyContractAddress.toHex()]);
    return;
  }

  // create if payout contract does not exist
  payoutStrategy = new DirectPayout(payoutStrategyContractAddress.toHex());

  // set PayoutStrategy entity fields
  payoutStrategy.strategyName = "DIRECT";
  payoutStrategy.strategyAddress = event.params.payoutImplementation.toHex();
  payoutStrategy.strategyImplementationAddress = "0xaed1ce441fa6ad4f89d28026f3e7491394deea5f";

  payoutStrategy.version = VERSION;

  // set timestamp
  payoutStrategy.createdAt = event.block.timestamp;
  payoutStrategy.updatedAt = event.block.timestamp;

  // load contract
  const directStrategyContract = DirectPayoutStrategyContract.bind(payoutStrategyContractAddress);
  payoutStrategy.vaultAddress = directStrategyContract.vaultAddress().toHexString();
  payoutStrategy.roundFeePercentage = directStrategyContract.roundFeePercentage();
  payoutStrategy.roundFeeAddress = directStrategyContract.roundFeeAddress().toHexString();

  let alloSettingsAddress = directStrategyContract.alloSettings()
  let alloSettings = getAlloSettings(alloSettingsAddress);
  payoutStrategy.alloSetting = alloSettings.id;

  payoutStrategy.save();

  PayoutStrategyImplementation.create(payoutStrategyContractAddress);
}

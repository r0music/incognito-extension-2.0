import { dispatch, store } from "@redux/store/store";
import Storage from "@services/storage";
import { measure } from "@utils/func";
import { actionFetchingScanCoins, actionFistTimeScanCoins, isFetchingScanCoinsSelector } from "@redux/scanCoins";
import { createLogger } from "@core/utils";
import uniqBy from "lodash/uniqBy";
import { IBalance } from "@core/types";
import { actionFetchedFollowBalance, actionFetchingFollowBalance } from "@module/Assets";
import { isFetchingAssetsSelector } from "@module/Assets";
const { Account, PrivacyVersion } = require("incognito-chain-web-js/build/web/wallet");

const tokens = [
  "880ea0787f6c1555e59e3958a595086b7802fc7a38276bcd80d4525606557fbc",
  "ffd8d42dc40a8d166ea4848baf8b5f6e9fe0e9c30d60062eb7d44a8df9e00854",
];

const log = createLogger("background:scanCoins");

export const configAccount = async () => {
  let acc2 = new Account({});
  acc2.setRPCClient("https://testnet.incognito.org/fullnode");
  acc2.setStorageServices(Storage);
  await acc2.setKey(
    "112t8roafGgHL1rhAP9632Yef3sx5k8xgp8cwK4MCJsCL1UWcxXvpzg97N4dwvcD735iKf31Q2ZgrAvKfVjeSUEvnzKJyyJD2z2WHZEtrbP4",
  );
  return acc2;
};

export const scanCoins = async () => {
  const accountSender = await configAccount();
  const isFetching = isFetchingScanCoinsSelector(store.getState());
  // Validate data
  if (!accountSender || isFetching) return;

  try {
    const otaKey = accountSender.getOTAKey();

    // Get coins scanned from storage, existed ignore and continue scan
    const coinsStore = await accountSender.getStorageCoinsScan();
    if (!coinsStore) {
      dispatch(actionFistTimeScanCoins({ isScanning: true, otaKey }));
    }

    dispatch(actionFetchingScanCoins({ isFetching: true }));

    // start scan coins
    const { elapsed, result } = await measure(accountSender, "scanCoins", { tokenList: tokens });

    if (!coinsStore) {
      dispatch(actionFistTimeScanCoins({ isScanning: false, otaKey }));
    }

    log("scanCoins: ", { elapsed, otaKey, coins: result });
  } catch (error) {
    log("SCAN COINS WITH ERROR: ", error);
  } finally {
    dispatch(actionFetchingScanCoins({ isFetching: false }));
  }
};

export const getBalance = async ({
  accountSender,
  tokenID,
}: {
  accountSender: any;
  tokenID: string;
}): Promise<number> => {
  let balance = 0;
  try {
    balance = await accountSender.getBalance({
      version: PrivacyVersion.ver3,
      tokenID: tokenID,
    });
  } catch (error) {
    log("GET BALANCE ERROR: ", error);
  }
  return balance;
};

export const getFollowTokensBalance = async () => {
  const isFetching = isFetchingAssetsSelector(store.getState());
  const accountSender = await configAccount();
  const otaKey = accountSender.getOTAKey();

  if (!otaKey || isFetching) return;

  try {
    dispatch(actionFetchingFollowBalance({ isFetching: true }));
    // follow tokens balance
    const { balance }: { balance: IBalance[] } = await accountSender.getFollowTokensBalance({
      defaultTokens: tokens,
      version: PrivacyVersion.ver3,
    });
    const _balance = uniqBy(balance, "id");
    dispatch(actionFetchedFollowBalance({ balance: _balance, OTAKey: otaKey }));
  } catch (error) {
    log("LOAD FOLLOW TOKENS BALANCE ERROR: ", error);
  } finally {
    dispatch(actionFetchingFollowBalance({ isFetching: false }));
  }
};

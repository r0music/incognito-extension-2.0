import { getPTokenList } from "@redux/token";
import React, { FunctionComponent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppThunkDispatch } from "@redux/store";
import { compose } from "recompose";
import { useHistory } from "react-router-dom";
import { actionToggleModal } from "@module/Modal";
import { isFirstTimeScanCoinsSelector } from "@redux/scanCoins";
import { otaKeyOfDefaultAccountSelector } from "@redux/account/account.selectors";
import { useBackground } from "@popup/context/background";
import throttle from "lodash/throttle";
import { useLoading } from "@popup/context/loading";

const withPToken = (WrappedComponent: FunctionComponent) => {
  return (props: any) => {
    const dispatch: AppThunkDispatch = useDispatch();

    const getTokensList = () => dispatch(getPTokenList());

    React.useEffect(() => {
      getTokensList().then();
    }, []);

    return <WrappedComponent {...props} />;
  };
};

const withRouteChange = (WrappedComponent: any) => {
  return (props: any) => {
    const dispatch: AppThunkDispatch = useDispatch();
    const history = useHistory();
    const handleClose = () => dispatch(actionToggleModal({}));
    React.useEffect(() => {
      const listener = history.listen(() => {
        handleClose();
      });
      return () => {
        listener();
      };
    }, []);
    return <WrappedComponent {...props} />;
  };
};

const withLoading = (WrappedComponent: any) => {
  return (props: any) => {
    const { showLoading } = useLoading();
    const isScanCoins = useSelector(isFirstTimeScanCoinsSelector);
    const OTAKey = useSelector(otaKeyOfDefaultAccountSelector);
    React.useEffect(() => {
      showLoading(!!isScanCoins && !!OTAKey);
    }, [isScanCoins, OTAKey]);
    return <WrappedComponent {...props} />;
  };
};

export const withBalance = (WrappedComponent: FunctionComponent) => (props: any) => {
  const { request } = useBackground();
  const OTAKey = useSelector(otaKeyOfDefaultAccountSelector);
  const loadFollowTokensBalance = throttle(() => request("popup_followTokensBalance", {}), 1000);

  React.useEffect(() => {
    loadFollowTokensBalance();
    // interval load balance
    setInterval(() => {
      loadFollowTokensBalance();
    }, 2000);
  }, [OTAKey]);

  return <WrappedComponent {...props} />;
};

export default compose(withPToken, withRouteChange, withLoading, withBalance);

import { AddButton } from "@components/AddButton/AddButton";
import Header from "@components/BaseComponent/Header";
import BodyLayout from "@components/layout/BodyLayout";
import { Paths } from "@components/routes/paths";
import { useBackground } from "@popup/context/background";
import { useLoading } from "@popup/context/loading";
import { ellipsisCenter } from "@popup/utils";
import { useCallAsync } from "@popup/utils/notifications";
import { defaultAccountSelector, listAccountSelector } from "@redux/account/account.selectors";
import { trim } from "lodash";
import React from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import AccountItem from "./AccountItem/AccountItem";

const SelectAccountPage = React.memo(() => {
  const { request } = useBackground();
  const callAsync = useCallAsync();
  const history = useHistory();
  const { showLoading } = useLoading();
  const defaultAccount: any = useSelector(defaultAccountSelector);
  const listAccount = useSelector(listAccountSelector);

  const switchAccount = (accountName: string) => {
    showLoading({
      value: true,
    });
    callAsync(request("popup_switchAccount", { accountName: trim(accountName) }), {
      progress: { message: "Switching Account..." },
      success: { message: "Switch Done" },
      onSuccess: () => {
        showLoading({
          value: false,
        });
        history.goBack();
      },
    });
  };

  const accountItemOnClick = async (accountItem: any) => {
    const accountName = accountItem.AccountName || accountItem.name;
    if (accountName && (accountName != defaultAccount.AccountName || accountName != defaultAccount?.name)) {
      switchAccount(accountName);
    } else {
      history.goBack();
    }
  };

  return (
    <>
      <Header
        title="Keychain"
        onBackClick={() => history.goBack()}
        rightView={<AddButton onClick={() => history.push(Paths.createAccountPage)} />}
      />
      <BodyLayout className="scroll-view">
        {listAccount &&
          listAccount.map((accountItem) => {
            const name = accountItem.AccountName || accountItem.name;
            const paymentAddress = accountItem.paymentAddress;
            const isSelected = name == defaultAccount?.AccountName || name == defaultAccount?.name;
            const paymentAddressEllipsis = ellipsisCenter({
              str: paymentAddress || "",
              limit: 13,
            });
            return (
              <AccountItem
                key={paymentAddress}
                isSelected={isSelected}
                title={name}
                description={paymentAddressEllipsis}
                onClick={() => accountItemOnClick(accountItem)}
              />
            );
          })}
      </BodyLayout>
    </>
  );
});

export default SelectAccountPage;

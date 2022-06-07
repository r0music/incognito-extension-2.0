import React from "react";
import { useSelector } from "react-redux";
import { validator } from "@components/ReduxForm";
import { sendDataSelector } from "./Send.selector";
import { ISendData } from "@module/Send/Send.types";
import convert from "@utils/convert";
import debounce from "lodash/debounce";
import BigNumber from "bignumber.js";
import { detectToken } from "@utils/misc";

export interface TInner {
  validateAmount: () => any;
}

interface IState {
  maxAmountValidator: any;
}

const enhance = (WrappedComponent: React.FunctionComponent) => (props: any) => {
  const sendData: ISendData = useSelector(sendDataSelector);
  const { selectedPrivacy, maxAmountText, isSend } = sendData;

  const initialState: IState = {
    maxAmountValidator: undefined,
  };

  const [state, setState] = React.useState({ ...initialState });
  const { maxAmountValidator } = state;

  const setFormValidator = debounce(async () => {
    const maxAmountNum = convert.toNumber({
      text: maxAmountText,
      autoCorrect: true,
    });

    console.log(maxAmountNum);

    let currentState = { ...state };
    if (Number.isFinite(maxAmountNum)) {
      currentState = {
        ...state,
        maxAmountValidator: validator.maxValue(
          maxAmountNum,
          new BigNumber(maxAmountNum).toNumber() > 0
            ? `Max amount you can ${isSend ? "send" : "unshield"} is ${maxAmountText} ${selectedPrivacy?.symbol}`
            : "Your balance is insufficient.",
        ),
      };
      await setState(currentState);
    }
  }, 200);

  const getAmountValidator = () => {
    const val = [];
    if (maxAmountValidator) val.push(maxAmountValidator);
    if (selectedPrivacy?.isIncognitoToken || detectToken.ispNEO(selectedPrivacy.tokenId)) {
      val.push(...validator.combinedNanoAmount);
    }
    val.push(...validator.combinedAmount);
    return [...val];
  };

  React.useEffect(() => {
    setFormValidator();
  }, [sendData.selectedPrivacy]);

  const validateAmount: any[] = getAmountValidator();

  return (
    <WrappedComponent
      {...{
        ...props,
        validateAmount,
      }}
    />
  );
};

export default enhance;

export type Movement = {
  id: number;
  date: Date;
  label: string;
  amount: number;
};

export type Balance = {
  date: Date;
  balance: number;
};

/**
 * A SafeBalance is a set of at least 2 balances.
 */
export type SafeBalances = [Balance, Balance, ...Balance[]];

export enum ValidationErrorMessage {
  BalancesMissing = 'At least one balance is missing',
  WithdrawalDifference = 'At least one withdrawal is missing',
  DepositDifference = 'At least one deposit is missing',
  Duplicate = 'A duplicate is found',
}

/**
 * ValidationError represents an error that occurs during the validation of movements and balances.
 * Can be one of the following:
 * - Duplicate: Indicates that a duplicate is found.
 * - Difference: Indicates at least one movement is missing.
 * details: Optional details about the error. Such as the duplicate id for instance.
 */
export type ValidationError = {
  type: 'Duplicate' | 'Difference' | 'BalancesMissing';
  message: ValidationErrorMessage;
  details?: string;
  period?: { start: Date; end: Date };
  difference?: number;
};

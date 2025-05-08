/**
 * Represents a bank movement with an ID, date, label, and amount.
 * @param id The unique identifier of the movement.
 * @param date The date of the movement.
 * @param label The label or description of the movement.
 * @param amount The amount of the movement.
 */
export type Movement = {
  id: number;
  date: Date;
  label: string;
  amount: number;
};

/**
 * Represents a balance at a specific date.
 * @param date The date of the balance.
 * @param balance The balance amount.
 */
export type Balance = {
  date: Date;
  balance: number;
};

/**
 * Represents a group of movements along with their start and end balances.
 */
export type MovementGroup = {
  movements: Movement[];
  start: Balance;
  end: Balance;
};

/**
 * A SafeBalance is a set of at least 2 balances.
 */
export type SafeBalances = [Balance, Balance, ...Balance[]];

/**
 * ValidationErrorMessage is an enum that represents the different error messages that can occur during validation.
 */
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

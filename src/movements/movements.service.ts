import { Injectable, Logger } from '@nestjs/common';

import {
  Balance,
  Movement,
  MovementGroup,
  SafeBalances,
  ValidationError,
  ValidationErrorMessage,
} from './movement.model';

@Injectable()
export class MovementsService {
  private readonly logger = new Logger(MovementsService.name);
  validation(movements: Movement[], balances: Balance[]): ValidationError[] {
    // Ensure there are at least two balances
    if (!this.isSafeBalances(balances)) {
      return [{ type: 'BalancesMissing', message: ValidationErrorMessage.BalancesMissing }];
    }

    const errors: ValidationError[] = [];
    this.logger.log('Validation started');

    // Order movements and balances by date
    const orderedMovements = movements.sort((a, b) => a.date.getTime() - b.date.getTime());
    const orderedBalances = balances.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Detect duplicates
    const duplicateError = this.detectDuplicates(orderedMovements);
    if (duplicateError) {
      return [duplicateError];
    }
    // Grouping the movements by time period to check independently if the movements are valid for each period
    const groupedMovements = this.groupMovementsByTimePeriod(orderedMovements, orderedBalances);
    for (const group of groupedMovements) {
      const error = this.validateMovementGroup(group);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Ensures that the balances array has at least two elements.
   * @param balances the ordered balances
   * @returns true if the balances array has at least two elements, false otherwise
   */
  private isSafeBalances(balances: Balance[]): balances is SafeBalances {
    return balances.length >= 2;
  }

  /**
   * This function groups movements by time period based on the balances.
   * It slices the movements array into groups based on the start and end dates of each balance.
   * This function might be a bit overkill, but it allows us to group the movements in one operation without parsing and filtering each time the movements array.
   * @param movements the ordered movements
   * @param balances the ordered balances, it needs to have at least 2 elements
   */
  private groupMovementsByTimePeriod(movements: Movement[], balances: SafeBalances): MovementGroup[] {
    const groupedMovements: MovementGroup[] = [];

    // Remove the movements prior to the first balance
    const firstMovement = movements.findIndex((movement) => movement.date >= balances[0].date);
    if (firstMovement !== -1) {
      movements.splice(0, firstMovement);
    }

    // For each period, getting the movements subset
    for (let i = 0, j = 1; j < balances.length; i++, j++) {
      const startBalance = balances[i];
      const endBalance = balances[j];

      // If findIndex returns -1, lastMovementIndex is set to the last index of the movements array
      const lastMovementIndex = movements.findIndex((movement) => movement.date >= endBalance.date);
      const safeLastMovementIndex = lastMovementIndex === -1 ? movements.length : lastMovementIndex;

      // Removing the subset movements from the original movements array into the group
      const movementsSubset = movements.splice(0, safeLastMovementIndex);
      groupedMovements.push({
        movements: movementsSubset,
        start: startBalance,
        end: endBalance,
      });
    }
    return groupedMovements;
  }

  private validateMovementGroup({ movements, start, end }: MovementGroup): ValidationError | null {
    const totalAmount = movements.reduce((sum, movement) => sum + movement.amount, 0);
    const expectedBalanceChange = end.balance - start.balance;

    if (totalAmount - expectedBalanceChange === 0) {
      return null;
    }

    const message =
      totalAmount > expectedBalanceChange
        ? ValidationErrorMessage.WithdrawalDifference
        : ValidationErrorMessage.DepositDifference;
    return {
      type: 'Difference',
      message,
      period: { start: start.date, end: end.date },
      difference: totalAmount - expectedBalanceChange,
    };
  }

  private detectDuplicates(movements: Movement[]): ValidationError | null {
    // Map id => count
    const seen: Record<number, number> = {};
    for (const movement of movements) {
      seen[movement.id] = seen[movement.id] + 1 || 1;
    }

    // Detect multiple duplicates and return all occurences
    const multiples = Object.entries(seen)
      .filter(([_, count]) => count > 1)
      .map(([id]) => id);
    if (multiples.length > 0) {
      return {
        type: 'Duplicate',
        message: ValidationErrorMessage.Duplicate,
        details: multiples.join(', '),
      };
    }

    return null;
  }
}

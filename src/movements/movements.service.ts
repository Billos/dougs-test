import { Injectable, Logger } from '@nestjs/common';

import { Balance, Movement, ValidationError, ValidationErrorMessage } from './movement.model';

type MovementGroup = {
  movements: Movement[];
  start: Balance;
  end: Balance;
};

@Injectable()
export class MovementsService {
  private readonly logger = new Logger(MovementsService.name);
  validation(movements: Movement[], balances: Balance[]): ValidationError[] {
    // Ensure there are at least two balances
    if (balances.length < 2) {
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
   * This function groups movements by time period based on the balances.
   * It slices the movements array into groups based on the start and end dates of each balance.
   * This function might be a bit overkill, but it allows us to group the movements in one operation without parsing and filtering each time the movements array.
   * @param movements the ordered movements
   * @param balances the ordered balances
   */
  private groupMovementsByTimePeriod(movements: Movement[], balances: Balance[]): MovementGroup[] {
    const groupedMovements: MovementGroup[] = [];

    // Skiping until the first movement in the period range
    let currentMovementIndex = movements.findIndex((movement) => movement.date >= balances[0].date);
    // For each period, getting the movements subset
    for (const startBalance of balances) {
      // Stop if we reach the last balance
      if (balances.indexOf(startBalance) === balances.length - 1) {
        break;
      }

      // Defining the end balance
      const endBalance = balances[balances.indexOf(startBalance) + 1];

      // If findIndex returns -1, lastMovementIndex is set to the last index of the movements array
      const lastMovementIndex = movements.findIndex((movement) => movement.date >= endBalance.date);
      const safeLastMovementIndex = lastMovementIndex === -1 ? movements.length : lastMovementIndex;

      const movementsSubset = movements.slice(currentMovementIndex, safeLastMovementIndex);
      groupedMovements.push({
        movements: movementsSubset,
        start: startBalance,
        end: endBalance,
      });
      currentMovementIndex = safeLastMovementIndex;
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

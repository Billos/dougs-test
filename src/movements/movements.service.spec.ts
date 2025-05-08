/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';

import { Balance, Movement, MovementGroup, SafeBalances, ValidationErrorMessage } from './movement.model';
import { MovementsService } from './movements.service';

describe('MovementsService', () => {
  let service: MovementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovementsService],
    }).compile();

    service = module.get<MovementsService>(MovementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Testing isSafeBalances', () => {
    it('should return true for safe balances', () => {
      const balances: Balance[] = [
        { date: new Date('2025-01-01'), balance: 0 },
        { date: new Date('2025-01-03'), balance: 100 },
      ];
      expect(service.isSafeBalances(balances)).toBe(true);
    });
    it('should return true for safe balances with more than two elements', () => {
      const balances: Balance[] = [
        { date: new Date('2025-01-01'), balance: 0 },
        { date: new Date('2025-01-03'), balance: 100 },
        { date: new Date('2025-01-05'), balance: 50 },
      ];
      expect(service.isSafeBalances(balances)).toBe(true);
    });
    it('should return false for unsafe balances', () => {
      const balances: Balance[] = [{ date: new Date('2025-01-01'), balance: 0 }];
      expect(service.isSafeBalances(balances)).toBe(false);
    });
  });

  describe('Testing groupMovementsByTimePeriod', () => {
    it('should group movements correctly', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2024-01-01'), label: 'Deposit', amount: 10 },
        { id: 2, date: new Date('2025-01-03'), label: 'Deposit', amount: 20 },
        { id: 3, date: new Date('2025-01-04'), label: 'Deposit', amount: 30 },
        { id: 4, date: new Date('2025-01-06'), label: 'Deposit', amount: 40 },
      ];
      const balances: SafeBalances = [
        { date: new Date('2025-01-02'), balance: 0 },
        { date: new Date('2025-01-05'), balance: 100 },
      ];
      const result = service.groupMovementsByTimePeriod(movements, balances);
      expect(result).toHaveLength(1);
      expect(result[0].movements).toHaveLength(2);
      expect(result[0].start).toEqual(balances[0]);
      expect(result[0].end).toEqual(balances[1]);
      expect(result[0].movements[0].id).toEqual(2);
      expect(result[0].movements[1].id).toEqual(3);
      // The movements array should only have the last movement that is outside the group
      expect(movements).toHaveLength(1);
    });

    it('should group movements into two periods', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2024-01-01'), label: 'Deposit', amount: 10 },
        { id: 2, date: new Date('2025-01-03'), label: 'Deposit', amount: 20 },
        { id: 3, date: new Date('2025-01-04'), label: 'Deposit', amount: 30 },
        { id: 4, date: new Date('2025-01-06'), label: 'Deposit', amount: 40 },
      ];
      const balances: SafeBalances = [
        { date: new Date('2025-01-02'), balance: 0 },
        { date: new Date('2025-01-05'), balance: 100 },
        { date: new Date('2025-01-07'), balance: 200 },
      ];
      const result = service.groupMovementsByTimePeriod(movements, balances);
      expect(result).toHaveLength(2);
      expect(result[0].movements).toHaveLength(2);
      expect(result[0].start).toEqual(balances[0]);
      expect(result[0].end).toEqual(balances[1]);
      expect(result[0].movements[0].id).toEqual(2);
      expect(result[0].movements[1].id).toEqual(3);
      expect(result[1].movements).toHaveLength(1);
      expect(result[1].start).toEqual(balances[1]);
      expect(result[1].end).toEqual(balances[2]);
      expect(result[1].movements[0].id).toEqual(4);
    });
  });

  describe('Testing validateMovementGroup', () => {
    it('should return null for valid movements', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 100 },
        { id: 2, date: new Date('2025-01-02'), label: 'Withdrawal', amount: -20 },
      ];
      const group: MovementGroup = {
        movements,
        start: { date: new Date('2025-01-01'), balance: 0 },
        end: { date: new Date('2025-01-03'), balance: 80 },
      };

      const result = service.validateMovementGroup(group);
      expect(result).toBeNull();
    });

    it('should return null for more complex valid movements', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 10 },
        { id: 2, date: new Date('2025-01-02'), label: 'Deposit', amount: 20 },
        { id: 3, date: new Date('2025-01-03'), label: 'Deposit', amount: 30 },
        { id: 5, date: new Date('2025-01-03'), label: 'Withdrawal', amount: -30 },
        { id: 4, date: new Date('2025-01-06'), label: 'Deposit', amount: 40 },
      ];
      const group: MovementGroup = {
        movements,
        start: { date: new Date('2025-01-01'), balance: 0 },
        end: { date: new Date('2025-01-07'), balance: 70 },
      };

      const result = service.validateMovementGroup(group);
      expect(result).toBeNull();
    });

    it('should return a withdrawal difference error for a detected withdrawal difference with no matching movement', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 20 },
        { id: 2, date: new Date('2025-01-02'), label: 'Deposit', amount: 20 },
        { id: 3, date: new Date('2025-01-03'), label: 'Deposit', amount: 30 },
        { id: 4, date: new Date('2025-01-06'), label: 'Deposit', amount: 40 },
      ];
      const group: MovementGroup = {
        movements,
        start: { date: new Date('2025-01-01'), balance: 0 },
        end: { date: new Date('2025-01-07'), balance: 71 },
      };
      const result = service.validateMovementGroup(group);
      expect(result).toEqual({
        type: 'Difference',
        message: ValidationErrorMessage.WithdrawalDifference,
        period: { start: new Date('2025-01-01'), end: new Date('2025-01-07') },
        difference: 39,
        details: '',
      });
    });

    it('should return a withdrawal difference error for a detected withdrawal difference with one matching movement', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 20 },
        { id: 2, date: new Date('2025-01-02'), label: 'Deposit', amount: 20 },
        { id: 3, date: new Date('2025-01-03'), label: 'Deposit', amount: 30 },
        { id: 4, date: new Date('2025-01-06'), label: 'Deposit', amount: 40 },
      ];
      const group: MovementGroup = {
        movements,
        start: { date: new Date('2025-01-01'), balance: 0 },
        end: { date: new Date('2025-01-07'), balance: 70 },
      };
      const result = service.validateMovementGroup(group);
      expect(result).toEqual({
        type: 'Difference',
        message: ValidationErrorMessage.WithdrawalDifference,
        period: { start: new Date('2025-01-01'), end: new Date('2025-01-07') },
        difference: 40,
        details: 'The following movements match the difference: 4',
      });
    });

    it('should return a withdrawal difference error for a detected withdrawal difference with two matching movements', () => {
      const movements: Movement[] = [
        { id: 3, date: new Date('2025-01-03'), label: 'Deposit', amount: 30 },
        { id: 4, date: new Date('2025-01-06'), label: 'Deposit', amount: 40 },
        { id: 5, date: new Date('2025-01-06'), label: 'Deposit', amount: 40 },
      ];
      const group: MovementGroup = {
        movements,
        start: { date: new Date('2025-01-01'), balance: 0 },
        end: { date: new Date('2025-01-07'), balance: 70 },
      };
      const result = service.validateMovementGroup(group);
      expect(result).toEqual({
        type: 'Difference',
        message: ValidationErrorMessage.WithdrawalDifference,
        period: { start: new Date('2025-01-01'), end: new Date('2025-01-07') },
        difference: 40,
        details: 'The following movements match the difference: 4, 5',
      });
    });

    it('should return a deposit difference error for a detected deposit difference with no matching movement', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 10 },
        { id: 3, date: new Date('2025-01-03'), label: 'Deposit', amount: 30 },
        { id: 5, date: new Date('2025-01-03'), label: 'Withdrawal', amount: -30 },
        { id: 4, date: new Date('2025-01-06'), label: 'Deposit', amount: 40 },
      ];
      const group: MovementGroup = {
        movements,
        start: { date: new Date('2025-01-01'), balance: 0 },
        end: { date: new Date('2025-01-07'), balance: 70 },
      };
      const result = service.validateMovementGroup(group);
      expect(result).toEqual({
        type: 'Difference',
        message: ValidationErrorMessage.DepositDifference,
        period: { start: new Date('2025-01-01'), end: new Date('2025-01-07') },
        details: '',
        difference: -20,
      });
    });

    it('should return a deposit difference error for a detected deposit difference with one matching movement', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 100 },
        { id: 3, date: new Date('2025-01-03'), label: 'Deposit', amount: 30 },
        { id: 5, date: new Date('2025-01-03'), label: 'Withdrawal', amount: -20 },
        { id: 4, date: new Date('2025-01-06'), label: 'Withdrawal', amount: -50 },
      ];
      const group: MovementGroup = {
        movements,
        start: { date: new Date('2025-01-01'), balance: 0 },
        end: { date: new Date('2025-01-07'), balance: 80 },
      };
      const result = service.validateMovementGroup(group);
      expect(result).toEqual({
        type: 'Difference',
        message: ValidationErrorMessage.DepositDifference,
        period: { start: new Date('2025-01-01'), end: new Date('2025-01-07') },
        details: 'The following movements match the difference: 5',
        difference: -20,
      });
    });
    it('should return a deposit difference error for a detected deposit difference with two matching movements', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 100 },
        { id: 3, date: new Date('2025-01-03'), label: 'Deposit', amount: 30 },
        { id: 5, date: new Date('2025-01-03'), label: 'Withdrawal', amount: -20 },
        { id: 6, date: new Date('2025-01-03'), label: 'Withdrawal', amount: -20 },
        { id: 4, date: new Date('2025-01-06'), label: 'Withdrawal', amount: -30 },
      ];
      const group: MovementGroup = {
        movements,
        start: { date: new Date('2025-01-01'), balance: 0 },
        end: { date: new Date('2025-01-07'), balance: 80 },
      };
      const result = service.validateMovementGroup(group);
      expect(result).toEqual({
        type: 'Difference',
        message: ValidationErrorMessage.DepositDifference,
        period: { start: new Date('2025-01-01'), end: new Date('2025-01-07') },
        details: 'The following movements match the difference: 5, 6',
        difference: -20,
      });
    });
  });

  describe('Testing detectDuplicates', () => {
    it('should return a duplicate error if duplicates are found', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 100 },
        { id: 1, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
      ];
      const error = service.detectDuplicates(movements);
      expect(error).toEqual({
        type: 'Duplicate',
        message: ValidationErrorMessage.Duplicate,
        details: '1',
      });
    });

    it('should return a duplicate error with the correct ids if multiple duplicates are found', () => {
      const movements: Movement[] = [
        { id: 3, date: new Date('2025-01-05'), label: 'Deposit', amount: 100 },
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 100 },
        { id: 2, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
        { id: 1, date: new Date('2025-01-03'), label: 'Deposit', amount: 100 },
        { id: 3, date: new Date('2025-01-04'), label: 'Deposit', amount: 100 },
      ];
      const error = service.detectDuplicates(movements);
      expect(error).toEqual({
        type: 'Duplicate',
        message: ValidationErrorMessage.Duplicate,
        details: '1, 3',
      });
    });

    it('should return null if no duplicates are found', () => {
      const movements: Movement[] = [
        { id: 1, date: new Date('2025-01-01'), label: 'Deposit', amount: 100 },
        { id: 2, date: new Date('2025-01-02'), label: 'Deposit', amount: 100 },
      ];
      const error = service.detectDuplicates(movements);
      expect(error).toBeNull();
    });
  });
});
